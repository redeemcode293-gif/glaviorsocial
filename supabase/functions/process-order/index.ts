import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrderProcessRequest {
  orderId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { orderId }: OrderProcessRequest = await req.json();

    if (!orderId) {
      return new Response(JSON.stringify({ error: 'Order ID required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Processing order: ${orderId}`);

    // Get order with service info
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        services (
          id,
          name,
          provider_id,
          provider_service_id,
          provider_price
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Order not found:', orderError);
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const service = order.services;
    if (!service?.provider_id || !service?.provider_service_id) {
      // No provider assigned - mark as manual
      await supabase
        .from('orders')
        .update({ status: 'pending' })
        .eq('id', orderId);

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Order pending manual processing',
        status: 'pending'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get providers sorted by priority for failover
    const { data: providers, error: providerError } = await supabase
      .from('api_providers')
      .select('*')
      .eq('status', 'active')
      .order('priority', { ascending: true });

    if (providerError || !providers?.length) {
      console.error('No active providers found');
      await supabase
        .from('orders')
        .update({ status: 'pending' })
        .eq('id', orderId);

      return new Response(JSON.stringify({ error: 'No active providers' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Find primary provider for this service
    let primaryProvider = providers.find(p => p.id === service.provider_id);
    const backupProviders = providers.filter(p => p.id !== service.provider_id);

    // Try primary provider first, then fallback
    const providersToTry = primaryProvider 
      ? [primaryProvider, ...backupProviders] 
      : providers;

    let lastError = null;
    let providerOrderId = null;

    for (const provider of providersToTry) {
      try {
        console.log(`Attempting order with provider: ${provider.name}`);

        // Call provider API to place order
        const orderData = new URLSearchParams({
          key: provider.api_key,
          action: 'add',
          service: service.provider_service_id,
          link: order.link,
          quantity: order.quantity.toString()
        });

        const response = await fetch(provider.api_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: orderData
        });

        const result = await response.json();
        console.log(`Provider ${provider.name} response:`, result);

        if (result.order) {
          // Success - update order
          providerOrderId = result.order;
          
          await supabase
            .from('orders')
            .update({ 
              status: 'processing',
              start_count: result.start_count || 0
            })
            .eq('id', orderId);

          console.log(`Order ${orderId} placed successfully with provider ${provider.name}`);

          return new Response(JSON.stringify({ 
            success: true,
            providerOrderId,
            provider: provider.name,
            status: 'processing'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } else if (result.error) {
          lastError = result.error;
          console.log(`Provider ${provider.name} error: ${result.error}`);
          // Continue to next provider
        }
      } catch (err: any) {
        console.error(`Provider ${provider.name} failed:`, err);
        lastError = err?.message || String(err);
        // Continue to next provider
      }
    }

    // All providers failed
    console.error('All providers failed for order', orderId);
    await supabase
      .from('orders')
      .update({ status: 'failed' })
      .eq('id', orderId);

    return new Response(JSON.stringify({ 
      error: 'All providers failed',
      lastError,
      status: 'failed'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Process order error:', error);
    return new Response(JSON.stringify({ error: error?.message || String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
