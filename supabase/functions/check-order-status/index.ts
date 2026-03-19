import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { decryptApiKey } from "../_shared/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const mapProviderStatus = (value: string, fallback: string) => {
  const providerStatus = value.toLowerCase();
  if (providerStatus === "completed") return "completed";
  if (["in progress", "processing"].includes(providerStatus)) return "processing";
  if (providerStatus === "partial") return "partial";
  if (["canceled", "cancelled"].includes(providerStatus)) return "cancelled";
  if (providerStatus === "pending") return "pending";
  return fallback;
};

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

    const { orderId } = await req.json();
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
          provider_id,
          provider_service_id
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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!order.provider_order_id) {
      const dispatch = await supabase.functions.invoke("process-order", {
        body: { orderId },
        headers: { Authorization: authHeader },
      });

      return new Response(JSON.stringify({
        status: order.status,
        message: "Order was pending with no provider order id. A provider submission attempt was triggered.",
        dispatch,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!order.services?.provider_id) {
      return new Response(JSON.stringify({ status: order.status, message: "No provider assigned" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: provider } = await supabase
      .from("api_providers")
      .select("*")
      .eq("id", order.services.provider_id)
      .single();

    if (!provider) {
      return new Response(JSON.stringify({ status: order.status, message: "Provider not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = new URLSearchParams({
      key: provider.api_key,
      action: "status",
      order: String(order.provider_order_id),
    });

    const response = await fetch(provider.api_url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const result = await response.json();
    if (result.status) {
      const newStatus = mapProviderStatus(String(result.status), order.status);
      const startCount = result.start_count !== undefined ? Number(result.start_count) : order.start_count;
      const remains = result.remains !== undefined ? Number(result.remains) : order.remains;

      await supabase
        .from("orders")
        .update({ status: newStatus, start_count: startCount, remains })
        .eq("id", orderId);

      return new Response(JSON.stringify({ status: newStatus, start_count: startCount, remains, charge: result.charge, rawStatus: result.status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ status: order.status, message: "Status from local database", providerResponse: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("check-order-status error", error);
    return new Response(JSON.stringify({ error: error?.message || String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
