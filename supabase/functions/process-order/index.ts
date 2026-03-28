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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { orderId } = await req.json();
    if (!orderId) throw new Error("Missing orderId payload");

    // 1. Fetch the exact order, the service mapped to it, and the provider's API details
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        *,
        services (
          provider_service_id,
          api_providers (
            id, api_url, api_key
          )
        )
      `)
      .eq("id", orderId)
      .single();

    if (orderError || !order) throw new Error("Order not found in database");
    
    const provider = order.services?.api_providers;
    if (!provider) throw new Error("Provider architecture missing for this service");

    // 2. Securely decrypt your Mesumax API Key
    let apiKey = provider.api_key;
    try { 
      apiKey = await decryptApiKey(provider.api_key); 
    } catch(e) {
      console.warn("Could not decrypt API key, attempting raw key format");
    }

    // 3. Build the exact API package Mesumax requires (SMM Standard)
    const params = new URLSearchParams();
    params.append("key", apiKey);
    params.append("action", "add");
    params.append("service", order.services.provider_service_id);
    params.append("link", order.link);
    params.append("quantity", order.quantity.toString());
    
    // 4. Transmit the order to the provider
    console.log(`Transmitting Order ${order.order_number} to Provider...`);
    const response = await fetch(provider.api_url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params
    });

    const result = await response.json();
    console.log("Provider Response:", result);

    // 5. Handle the Provider's Reality
    if (result.error) {
      console.error("Provider Rejected Order:", result.error);
      // Leave status as pending so you can manually review, but log the error
      return new Response(JSON.stringify({ success: false, error: result.error }), { headers: corsHeaders });
    }

    if (result.order) {
      // 6. Victory condition: Provider accepted. Link their ID and update UI to Processing.
      await supabase.from("orders").update({ 
        provider_order_id: String(result.order),
        status: "processing" 
      }).eq("id", orderId);
      
      return new Response(JSON.stringify({ success: true, providerOrderId: result.order }), { headers: corsHeaders });
    }

    throw new Error("Unknown provider response structure");

  } catch (error: any) {
    console.error("process-order critical failure:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
