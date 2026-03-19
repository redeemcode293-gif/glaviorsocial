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

  // ============================================================
  // SECURITY: Require a shared cron secret to prevent unauthenticated
  // callers from spamming provider API calls or submitting duplicate orders.
  // Set CRON_SECRET in Edge Function secrets.
  // ============================================================
  const cronSecret = req.headers.get("x-cron-secret");
  const expectedSecret = Deno.env.get("CRON_SECRET");
  if (!expectedSecret || cronSecret !== expectedSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    console.log("[auto-check-orders] Starting sync run");

    // Auto-fail stale pending orders that have no provider_order_id after 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: staleOrders } = await supabase
      .from("orders")
      .select("id, order_number")
      .eq("status", "pending")
      .is("provider_order_id", null)
      .lt("created_at", fifteenMinutesAgo);

    if (staleOrders && staleOrders.length > 0) {
      console.log(`[auto-check-orders] Auto-failing ${staleOrders.length} stale pending orders with no provider_order_id`);
      const staleIds = staleOrders.map((o) => o.id);
      await supabase
        .from("orders")
        .update({ status: "failed" })
        .in("id", staleIds);
    }

    interface ServiceInfo {
      provider_id: string | null;
      provider_service_id: string | null;
      is_active: boolean | null;
    }

    interface ActiveOrder {
      id: string;
      order_number: string;
      status: string;
      provider_order_id: string | null;
      start_count: number | null;
      remains: number | null;
      link: string;
      quantity: number;
      services: ServiceInfo | ServiceInfo[] | null;
    }

    const { data: activeOrders, error: ordersError } = await supabase
      .from("orders")
      .select(`
        id,
        order_number,
        status,
        provider_order_id,
        start_count,
        remains,
        link,
        quantity,
        services (
          provider_id,
          provider_service_id,
          is_active
        )
      `)
      .in("status", ["pending", "processing", "in_progress", "partial"])
      .limit(200) as { data: ActiveOrder[] | null; error: unknown };

    if (ordersError) {
      const errMsg = ordersError instanceof Error ? ordersError.message : String(ordersError);
      return new Response(JSON.stringify({ error: errMsg }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const getService = (s: ServiceInfo | ServiceInfo[] | null): ServiceInfo | null => {
      if (!s) return null;
      return Array.isArray(s) ? (s[0] ?? null) : s;
    };

    const providerIds = [...new Set(
      (activeOrders || [])
        .map((order) => getService(order.services)?.provider_id)
        .filter((id): id is string => Boolean(id))
    )];

    const { data: providers } = providerIds.length
      ? await supabase.from("api_providers").select("*").in("id", providerIds).eq("status", "active")
      : { data: [] as Array<Record<string, string>> };

    const providerMap = new Map((providers || []).map((provider) => [provider.id, provider]));

    let processedPending = 0;
    let checked = 0;
    let updated = 0;
    let failed = 0;

    for (const order of activeOrders || []) {
      const service = getService(order.services);
      if (!service?.is_active || !service?.provider_id || !service?.provider_service_id) {
        continue;
      }

      const provider = providerMap.get(service.provider_id);
      if (!provider) {
        failed += 1;
        continue;
      }

      try {
        if (!order.provider_order_id) {
          const addBody = new URLSearchParams({
            key: provider.api_key,
            action: "add",
            service: String(service.provider_service_id),
            link: String(order.link),
            quantity: String(order.quantity),
          });

          const addResponse = await fetch(provider.api_url, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: addBody,
          });
          const addResult = await addResponse.json();

          if (addResult.order) {
            await supabase
              .from("orders")
              .update({
                provider_order_id: String(addResult.order),
                status: "processing",
                start_count: addResult.start_count ? Number(addResult.start_count) : order.start_count,
              })
              .eq("id", order.id);
            processedPending += 1;
            updated += 1;
          } else {
            failed += 1;
          }

          continue;
        }

        const statusBody = new URLSearchParams({
          key: provider.api_key,
          action: "status",
          order: String(order.provider_order_id),
        });

        const response = await fetch(provider.api_url, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: statusBody,
          signal: AbortSignal.timeout(10000),
        });

        const result = await response.json();
        const newStatus = result.status ? mapProviderStatus(String(result.status), order.status) : order.status;
        const startCount = result.start_count !== undefined ? Number(result.start_count) : order.start_count;
        const remains = result.remains !== undefined ? Number(result.remains) : order.remains;

        if (newStatus !== order.status || startCount !== order.start_count || remains !== order.remains) {
          await supabase.from("orders").update({ status: newStatus, start_count: startCount, remains }).eq("id", order.id);
          updated += 1;
        }

        checked += 1;
      } catch (error: unknown) {
        console.error("[auto-check-orders] order failed", order.order_number, error);
        failed += 1;
      }
    }

    return new Response(JSON.stringify({ success: true, total: activeOrders?.length || 0, processedPending, checked, updated, failed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("[auto-check-orders] fatal error", error);
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
