import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[auto-check-orders] Starting order status check...');

    // Fetch all non-terminal orders that have a provider assigned
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        status,
        start_count,
        remains,
        services (
          provider_id,
          provider_service_id
        )
      `)
      .in('status', ['pending', 'processing', 'in progress'])
      .not('services', 'is', null)
      .limit(100);

    if (ordersError) {
      console.error('[auto-check-orders] Failed to fetch orders:', ordersError.message);
      return new Response(JSON.stringify({ error: ordersError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[auto-check-orders] Found ${orders?.length || 0} active orders to check`);

    if (!orders || orders.length === 0) {
      return new Response(JSON.stringify({ success: true, checked: 0, message: 'No active orders to check' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Gather unique provider IDs
    const providerIds = [...new Set(
      orders
        .map((o: any) => o.services?.provider_id)
        .filter(Boolean)
    )];

    // Fetch all relevant providers in one query
    const { data: providers } = await supabase
      .from('api_providers')
      .select('*')
      .in('id', providerIds)
      .eq('status', 'active');

    const providerMap: Record<string, any> = {};
    providers?.forEach((p: any) => { providerMap[p.id] = p; });

    let checked = 0;
    let updated = 0;
    let failed = 0;

    for (const order of orders) {
      const providerId = (order as any).services?.provider_id;
      const providerServiceId = (order as any).services?.provider_service_id;
      const provider = providerId ? providerMap[providerId] : null;

      if (!provider || !providerServiceId) {
        console.log(`[auto-check-orders] Order ${order.order_number} has no provider/service ID — skipping`);
        continue;
      }

      try {
        // Call provider status API
        const body = new URLSearchParams({
          key: provider.api_key,
          action: 'status',
          order: providerServiceId,
        });

        const response = await fetch(provider.api_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body,
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
          console.warn(`[auto-check-orders] Provider returned ${response.status} for order ${order.order_number}`);
          failed++;
          continue;
        }

        const result = await response.json();
        console.log(`[auto-check-orders] Provider response for ${order.order_number}:`, JSON.stringify(result));

        // Map provider status → internal status
        let newStatus = order.status;
        const raw = (result.status || '').toLowerCase();
        if (raw === 'completed') newStatus = 'completed';
        else if (raw === 'in progress' || raw === 'processing') newStatus = 'processing';
        else if (raw === 'partial') newStatus = 'partial';
        else if (raw === 'canceled' || raw === 'cancelled') newStatus = 'cancelled';
        else if (raw === 'pending') newStatus = 'pending';

        const startCount = result.start_count !== undefined ? parseInt(result.start_count) : order.start_count;
        const remains = result.remains !== undefined ? parseInt(result.remains) : order.remains;

        // Only update DB if something changed
        if (newStatus !== order.status || startCount !== order.start_count || remains !== order.remains) {
          const { error: updateError } = await supabase
            .from('orders')
            .update({
              status: newStatus,
              start_count: startCount,
              remains: remains,
            })
            .eq('id', order.id);

          if (updateError) {
            console.error(`[auto-check-orders] Failed to update order ${order.order_number}:`, updateError.message);
            failed++;
          } else {
            console.log(`[auto-check-orders] Updated order ${order.order_number}: ${order.status} → ${newStatus}`);
            updated++;
          }
        }

        checked++;
      } catch (err: any) {
        console.error(`[auto-check-orders] Error checking order ${order.order_number}:`, err.message);
        failed++;
      }
    }

    const summary = { success: true, checked, updated, failed, total: orders.length };
    console.log('[auto-check-orders] Done:', JSON.stringify(summary));

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[auto-check-orders] Fatal error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
