import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. SAFELY GRAB SECRETS (Prevents instant crashing)
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !serviceRoleKey) {
        console.error("CRITICAL: Missing Supabase Environment Variables.");
        return new Response(JSON.stringify({ error: "System Configuration Error. Admin notified." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 2. AUTHENTICATION
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid authentication token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 3. PARSE REQUEST
    const body = await req.json().catch(() => ({}));
    if (!body.serviceId || !body.link || !body.quantity) {
      return new Response(JSON.stringify({ error: "serviceId, link, and quantity are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const quantity = Math.floor(Number(body.quantity));
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return new Response(JSON.stringify({ error: "Invalid quantity" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 4. FETCH SERVICE & VALIDATE LIMITS
    const { data: service, error: serviceError } = await supabase
      .from("services")
      .select("id, name, base_price, min_quantity, max_quantity")
      .eq("id", body.serviceId)
      .maybeSingle();

    if (serviceError || !service) {
      return new Response(JSON.stringify({ error: "Service not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (quantity < service.min_quantity || quantity > service.max_quantity) {
      return new Response(JSON.stringify({ error: `Quantity must be between ${service.min_quantity} and ${service.max_quantity}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 5. CHECK WALLET
    const { data: wallet, error: walletError } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();

    if (walletError || !wallet) {
      return new Response(JSON.stringify({ error: "Wallet not found" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 6. THE 0.1% LOCK: EXACT USD PRICE ENFORCEMENT
    // We strictly calculate in USD. Frontend does the * 92 illusion.
    const basePrice = Number(service.base_price ?? 0);
    const appliedMultiplier = 1.4; // THE KILLSHOT: Forces 1.4x Retail Markup permanently.
    
    // Calculates total cost in strict USD (4 decimal precision prevents rounding leaks)
    const totalPrice = Number((((basePrice * appliedMultiplier) * quantity) / 1000).toFixed(4));

    if (Number(wallet.balance) < totalPrice) {
      return new Response(JSON.stringify({ error: "Insufficient balance" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 7. DEDUCT MONEY
    const newBalance = Number((Number(wallet.balance) - totalPrice).toFixed(4));
    const orderNumber = `ORD-${Date.now()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;

    const { data: walletUpdate, error: updateWalletError } = await supabase
      .from("wallets")
      .update({ balance: newBalance })
      .eq("user_id", user.id)
      .select("balance")
      .single();

    if (updateWalletError || !walletUpdate) {
      return new Response(JSON.stringify({ error: "Balance sync conflict. Please try again." }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 8. CREATE ORDER IN DATABASE (PENDING)
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        service_id: service.id,
        link: body.link,
        quantity: quantity,
        price: totalPrice,
        status: "pending",
        order_number: orderNumber,
        dripfeed: body.dripfeed ?? false,
        dripfeed_interval: body.dripfeed ? body.dripfeedInterval ?? null : null,
        auto_refill: body.autoRefill ?? false,
        applied_multiplier: appliedMultiplier,
        user_country_code: null, // Wipe regional traces
      })
      .select("*")
      .single();

    if (orderError || !order) {
      // Emergency Rollback
      await supabase.from("wallets").update({ balance: wallet.balance }).eq("user_id", user.id);
      return new Response(JSON.stringify({ error: "Failed to log order." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 9. LOG TRANSACTION
    await supabase.from("transactions").insert({
      user_id: user.id,
      type: "order",
      amount: -totalPrice,
      status: "completed",
      description: `Order #${order.order_number}`,
      reference_id: order.id,
      admin_visible: true,
    });

    // 10. ASYNCHRONOUS DROP-SHIPPING FIRE-AND-FORGET
    // This runs silently in the background. It does NOT wait. If it fails, the user never sees it.
    supabase.functions.invoke("process-order", {
      body: { orderId: order.id },
      headers: { Authorization: authHeader },
    }).catch(err => {
      console.log(`Silent Provider Failure for Order ${order.id}. Saved to DB for manual dispatch.`, err);
    });

    // 11. ULTIMATE SUCCESS RETURN (The User Sees Green)
    return new Response(JSON.stringify({
      success: true,
      order,
      walletBalance: newBalance,
      message: "Order placed successfully."
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("FATAL create-order error", error);
    return new Response(JSON.stringify({ error: "Internal Server Error", details: error?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
