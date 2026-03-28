import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateOrderRequest {
  serviceId: string;
  link: string;
  quantity: number;
  dripfeed?: boolean;
  dripfeedRuns?: number | null;
  dripfeedInterval?: number | null;
  autoRefill?: boolean;
  userCountryCode?: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid authentication token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: CreateOrderRequest = await req.json();
    if (!body.serviceId || !body.link || !body.quantity) {
      return new Response(JSON.stringify({ error: "serviceId, link, and quantity are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const quantity = Math.floor(Number(body.quantity));
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return new Response(JSON.stringify({ error: "Invalid quantity" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: service, error: serviceError } = await supabase
      .from("services")
      .select("id, name, base_price, min_quantity, max_quantity, provider_id, provider_service_id")
      .eq("id", body.serviceId)
      .eq("is_active", true)
      .maybeSingle();

    if (serviceError || !service) {
      return new Response(JSON.stringify({ error: "Service not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (quantity < service.min_quantity || service.max_quantity < quantity) {
      return new Response(JSON.stringify({ error: `Quantity must be between ${service.min_quantity} and ${service.max_quantity}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: wallet, error: walletError } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();

    if (walletError || !wallet) {
      return new Response(JSON.stringify({ error: "Wallet not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: servicePriceRow, error: priceError } = await supabase
      .from("panel_services")
      .select("price")
      .eq("provider_service_uuid", service.id)
      .maybeSingle();

    if (priceError) {
      console.error("Failed to read panel service price", priceError);
    }

    const basePrice = Number(servicePriceRow?.price ?? service.base_price ?? 0);

    // ============================================================
    // GLOBAL 2.0x LOCK: Backend deduces exactly double wholesale.
    // ============================================================
    let appliedMultiplier = 2.0; 
    let resolvedCountryCode: string | null = null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("country_code, pricing_override")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profile?.pricing_override === "provider") {
      appliedMultiplier = 1.0;
      resolvedCountryCode = profile.country_code ?? null;
    } else if (profile?.country_code) {
      resolvedCountryCode = profile.country_code;
      const { data: pricing } = await supabase
        .from("regional_pricing")
        .select("multiplier")
        .contains("countries", [profile.country_code])
        .maybeSingle();
      appliedMultiplier = Number(pricing?.multiplier ?? 2.0);
    } else {
      appliedMultiplier = 2.0;
    }

    const totalPrice = Number((((basePrice * appliedMultiplier) * quantity) / 1000).toFixed(2));

    if (Number(wallet.balance) < totalPrice) {
      return new Response(JSON.stringify({ error: "Insufficient balance" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newBalance = Number((Number(wallet.balance) - totalPrice).toFixed(2));
    const orderNumber = `ORD-${Date.now()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;

    const { data: walletUpdate, error: updateWalletError } = await supabase
      .from("wallets")
      .update({ balance: newBalance })
      .eq("user_id", user.id)
      .eq("balance", wallet.balance)
      .select("balance")
      .single();

    if (updateWalletError || !walletUpdate) {
      return new Response(JSON.stringify({ error: "Balance changed before the order could be placed. Please try again." }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
        user_country_code: resolvedCountryCode,
      })
      .select("*")
      .single();

    if (orderError || !order) {
      await supabase.from("wallets").update({ balance: wallet.balance }).eq("user_id", user.id);
      const errMsg = orderError instanceof Error ? orderError.message : String(orderError);
      return new Response(JSON.stringify({ error: errMsg || "Failed to create order" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: txError } = await supabase.from("transactions").insert({
      user_id: user.id,
      type: "order",
      amount: -totalPrice,
      status: "completed",
      description: `Order #${order.order_number}`,
      reference_id: order.id,
      admin_visible: true,
    });

    if (txError) {
      console.error("Failed to create transaction", txError);
    }

    let providerDispatch: unknown = null;
    try {
      providerDispatch = await supabase.functions.invoke("process-order", {
        body: { orderId: order.id },
        headers: { Authorization: authHeader },
      });
    } catch (dispatchError) {
      console.error("Failed to invoke process-order", dispatchError);
    }

    return new Response(JSON.stringify({
      success: true,
      order,
      walletBalance: newBalance,
      providerDispatch,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("create-order error", error);
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
