import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // Get authorization header to verify admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user is admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { providerId, action } = body;

    // ── fetch-preview: no saved provider needed, just fetch services from any URL ──
    if (action === 'fetch-preview') {
      const { apiUrl, apiKey } = body;
      if (!apiUrl || !apiKey) {
        return new Response(JSON.stringify({ error: 'apiUrl and apiKey are required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ key: apiKey, action: 'services' }),
        signal: AbortSignal.timeout(20000),
      });

      const services = await response.json();

      if (!Array.isArray(services)) {
        return new Response(JSON.stringify({ error: 'Provider did not return an array of services', raw: services }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ services }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch provider details
    const { data: provider, error: providerError } = await supabase
      .from('api_providers')
      .select('*')
      .eq('id', providerId)
      .single();

    if (providerError || !provider) {
      return new Response(JSON.stringify({ error: 'Provider not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Syncing provider: ${provider.name} (${provider.api_url})`);

    if (action === 'balance') {
      // Fetch balance from provider API
      const response = await fetch(provider.api_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          key: provider.api_key,
          action: 'balance',
        }),
      });

      const data = await response.json();
      console.log('Balance response:', data);

      if (data.balance !== undefined) {
        await supabase
          .from('api_providers')
          .update({ balance: parseFloat(data.balance) })
          .eq('id', providerId);
      }

      return new Response(JSON.stringify({ balance: data.balance }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'services') {
      // Fetch services from provider API
      const response = await fetch(provider.api_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          key: provider.api_key,
          action: 'services',
        }),
      });

      const services = await response.json();
      console.log(`Fetched ${Array.isArray(services) ? services.length : 0} services`);

      if (!Array.isArray(services)) {
        return new Response(JSON.stringify({ error: 'Invalid services response', data: services }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      let addedCount = 0;
      let updatedCount = 0;

      for (const service of services) {
        // Check if service already exists
        const { data: existingService } = await supabase
          .from('services')
          .select('id')
          .eq('provider_id', providerId)
          .eq('provider_service_id', String(service.service))
          .maybeSingle();

        // Determine platform from category
        let platform = 'Other';
        const categoryLower = (service.category || '').toLowerCase();
        const serviceName = (service.name || '').toLowerCase();
        
        if (categoryLower.includes('instagram') || serviceName.includes('instagram')) platform = 'Instagram';
        else if (categoryLower.includes('youtube') || serviceName.includes('youtube')) platform = 'YouTube';
        else if (categoryLower.includes('tiktok') || serviceName.includes('tiktok')) platform = 'TikTok';
        else if (categoryLower.includes('telegram') || serviceName.includes('telegram')) platform = 'Telegram';
        else if (categoryLower.includes('twitter') || categoryLower.includes('x ') || serviceName.includes('twitter')) platform = 'X';
        else if (categoryLower.includes('facebook') || serviceName.includes('facebook')) platform = 'Facebook';
        else if (categoryLower.includes('spotify') || serviceName.includes('spotify')) platform = 'Spotify';
        else if (categoryLower.includes('discord') || serviceName.includes('discord')) platform = 'Discord';
        else if (categoryLower.includes('twitch') || serviceName.includes('twitch')) platform = 'Twitch';
        else if (categoryLower.includes('snapchat') || serviceName.includes('snapchat')) platform = 'Snapchat';
        else if (categoryLower.includes('whatsapp') || serviceName.includes('whatsapp')) platform = 'WhatsApp';
        else if (categoryLower.includes('threads') || serviceName.includes('threads')) platform = 'Threads';
        else if (categoryLower.includes('linkedin') || serviceName.includes('linkedin')) platform = 'LinkedIn';
        else if (categoryLower.includes('pinterest') || serviceName.includes('pinterest')) platform = 'Pinterest';

        // Generate unique internal service ID (different from provider's)
        const internalServiceId = Math.floor(100000 + Math.random() * 900000);

        const serviceData = {
          name: service.name,
          description: service.description || service.name || 'No description available',
          platform,
          category: service.category || 'General',
          service_id: internalServiceId,
          provider_id: providerId,
          provider_service_id: String(service.service),
          provider_price: parseFloat(service.rate) || 0,
          base_price: parseFloat(service.rate) * 1.3, // 30% margin by default
          min_quantity: parseInt(service.min) || 100,
          max_quantity: parseInt(service.max) || 50000,
          refill_supported: service.refill === true || service.refill === 'true',
          dripfeed_supported: service.dripfeed === true || service.dripfeed === 'true',
          is_active: true,
        };

        if (existingService) {
          // Update existing service
          await supabase
            .from('services')
            .update({
              provider_price: serviceData.provider_price,
              min_quantity: serviceData.min_quantity,
              max_quantity: serviceData.max_quantity,
              refill_supported: serviceData.refill_supported,
              dripfeed_supported: serviceData.dripfeed_supported,
            })
            .eq('id', existingService.id);
          updatedCount++;
        } else {
          // Insert new service
          await supabase.from('services').insert(serviceData);
          addedCount++;
        }
      }

      // Update last sync time
      await supabase
        .from('api_providers')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('id', providerId);

      return new Response(JSON.stringify({ 
        success: true, 
        added: addedCount, 
        updated: updatedCount,
        total: services.length 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Sync error:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});