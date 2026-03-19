import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { decryptApiKey } from "../_shared/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderProcessRequest {
  orderId: string;
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

    const { orderId }: OrderProcessRequest = await req.json();
    if (!orderId) {
      return new Response(JSON.stringify({ error: "Order ID required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        *,
        services (
          id,
          name,
          provider_id,
          provider_service_id,
          is_active
        )
      `)
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: elevatedRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "owner"])
      .maybeSingle();

    if (order.user_id !== user.id && !elevatedRole) {
      return new Response(JSON.stringify({ error: "Unauthorized to process this order" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (order.provider_order_id) {
      return new Response(JSON.stringify({ success: true, providerOrderId: order.provider_order_id, status: order.status, message: "Order already sent to provider" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const service = order.services;
    if (!service || !service.is_active) {
      await supabase.from("orders").update({ status: "failed" }).eq("id", orderId);
      return new Response(JSON.stringify({ error: "Service is not available" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!service.provider_id || !service.provider_service_id) {
      return new Response(JSON.stringify({ success: true, status: order.status, message: "Order pending manual processing" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: providers, error: providerError } = await supabase
      .from("api_providers")
      .select("*")
      .eq("status", "active")
      .order("priority", { ascending: true });

    if (providerError || !providers?.length) {
      return new Response(JSON.stringify({ error: "No active providers" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const providersToTry = [
      ...providers.filter((provider) => provider.id === service.provider_id),
      ...providers.filter((provider) => provider.id !== service.provider_id),
    ];

    let lastError: string | null = null;
    for (const provider of providersToTry) {
      try {
        const body = new URLSearchParams({
          key: await decryptApiKey(provider.api_key),
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

        const result = await response.json();
        if (result.order) {
          await supabase
            .from("orders")
            .update({
              status: "processing",
              provider_order_id: String(result.order),
              start_count: result.start_count ? Number(result.start_count) : order.start_count,
            })
            .eq("id", orderId);

          return new Response(JSON.stringify({ success: true, providerOrderId: String(result.order), provider: provider.name, status: "processing" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        lastError = result.error || `Provider ${provider.name} returned no order id`;
      } catch (error: unknown) {
        lastError = error instanceof Error ? error.message : String(error);
      }
    }

    await supabase.from("orders").update({ status: "failed" }).eq("id", orderId);

    return new Response(JSON.stringify({ error: "All providers failed", lastError, status: "failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("process-order error", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
