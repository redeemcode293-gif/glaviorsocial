import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { decryptApiKey } from "../_shared/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { orderId } = await req.json().catch(() => ({}));
    if (!orderId) return new Response(JSON.stringify({ error: "Order ID required" }), { status: 400, headers: corsHeaders });

    // 1. Fetch Order Details
    const { data: order } = await supabase
      .from("orders")
      .select("*, services (id, name, provider_id, provider_service_id, is_active)")
      .eq("id", orderId)
      .single();

    if (!order || order.provider_order_id) {
      return new Response(JSON.stringify({ success: true, message: "Order already processed" }), { headers: corsHeaders });
    }

    const service = order.services;
    if (!service?.provider_id || !service?.provider_service_id) {
      await supabase.from("orders").update({ status: "manual_review", provider_error: "No provider linked" }).eq("id", orderId);
      return new Response(JSON.stringify({ success: true, message: "Manual routing required" }), { headers: corsHeaders });
    }

    // 2. Fetch Exact Provider (No random fallbacks)
    const { data: provider } = await supabase
      .from("api_providers")
      .select("*")
      .eq("id", service.provider_id)
      .single();

    if (!provider || provider.status !== "active") {
      await supabase.from("orders").update({ status: "manual_review", provider_error: "Provider inactive or missing" }).eq("id", orderId);
      return new Response(JSON.stringify({ success: true, message: "Provider inactive, flagged for manual review" }), { headers: corsHeaders });
    }

    // 3. The Decryption Bypass (Bulletproof API Key Extraction)
    let actualApiKey = provider.api_key;
    try {
      actualApiKey = await decryptApiKey(provider.api_key);
    } catch (e) {
      // Key is plaintext, skip decryption silently
    }

    // 4. Fire to Provider
    const body = new URLSearchParams({
      key: actualApiKey,
      action: "add",
      service: String(service.provider_service_id),
      link: order.link,
      quantity: String(order.quantity),
    });

    const response = await fetch(provider.api_url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const textResult = await response.text();
    let result;
    try {
      result = JSON.parse(textResult);
    } catch (e) {
      result = { error: "Provider returned invalid JSON" };
    }

    // 5. Handle Provider Response
    if (result.order) {
      // API SUCCESS: Link the provider ID, clear errors, and set to processing
      await supabase.from("orders").update({
        status: "processing",
        provider_order_id: String(result.order),
        start_count: result.start_count ? Number(result.start_count) : order.start_count,
        provider_error: null
      }).eq("id", orderId);

      return new Response(JSON.stringify({ success: true, providerOrderId: String(result.order) }), { headers: corsHeaders });
    }

    // 6. THE BILLIONAIRE OVERRIDE: 
    // If provider fails (insufficient funds, bad link), DO NOT fail the order. 
    // Keep the money, flag it for manual review, log the exact error silently.
    console.error(`Provider Rejected Order ${orderId}:`, result);
    
    await supabase.from("orders").update({
      status: "manual_review", 
      provider_error: result.error || JSON.stringify(result)
    }).eq("id", orderId);
    
    return new Response(JSON.stringify({ success: true, message: "Provider rejected, flagged for manual execution" }), { headers: corsHeaders });

  } catch (error: any) {
    console.error("process-order fatal error", error);
    // Even on fatal errors, return 200 so the create-order function doesn't panic
    return new Response(JSON.stringify({ success: true, message: "Internal error caught, order remains pending." }), { headers: corsHeaders });
  }
});
