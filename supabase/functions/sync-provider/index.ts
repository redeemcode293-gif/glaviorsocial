import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Locale-aware price parser.
 * Handles INR format (1,00,000.19 or 15,650.19) and USD format (15650.19).
 * Removes commas (thousand-separators in both locales) before parsing.
 */
function parseProviderPrice(raw: string | number): number {
  if (typeof raw === 'number') return isNaN(raw) ? 0 : raw;
  if (!raw) return 0;
  // Remove currency symbols, spaces, Rs, ₹
  const cleaned = String(raw).replace(/[₹Rs$€£\s]/g, '').trim();
  // Remove ALL commas (thousand separators in INR and USD) — keeps decimal dot
  const noCommas = cleaned.replace(/,/g, '');
  const parsed = parseFloat(noCommas);
  return isNaN(parsed) ? 0 : parsed;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header to verify admin/owner
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check admin OR owner role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'owner'])
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin or Owner access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { providerId, action } = body;

    // ── fetch-preview: fetch services from any provider URL ──
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
        signal: AbortSignal.timeout(30000),
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
      const response = await fetch(provider.api_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ key: provider.api_key, action: 'balance' }),
      });

      const data = await response.json();
      console.log('Balance response:', data);

      if (data.balance !== undefined) {
        await supabase
          .from('api_providers')
          .update({ balance: parseProviderPrice(data.balance) })
          .eq('id', providerId);
      }

      return new Response(JSON.stringify({ balance: data.balance }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'services') {
      const response = await fetch(provider.api_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ key: provider.api_key, action: 'services' }),
        signal: AbortSignal.timeout(60000),
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

      // Process in batches of 50 for performance
      const BATCH_SIZE = 50;
      for (let i = 0; i < services.length; i += BATCH_SIZE) {
        const batch = services.slice(i, i + BATCH_SIZE);
        
        // Get existing services for this batch
        const batchIds = batch.map((s: any) => String(s.service));
        const { data: existingServices } = await supabase
          .from('services')
          .select('id, provider_service_id')
          .eq('provider_id', providerId)
          .in('provider_service_id', batchIds);

        const existingMap = new Map((existingServices || []).map((s: any) => [s.provider_service_id, s.id]));

        const toInsert: any[] = [];
        const toUpdate: any[] = [];

        for (const service of batch) {
          const platform = detectPlatform(service.category || '', service.name || '');
          const providerPrice = parseProviderPrice(service.rate);
          const basePrice = providerPrice * 1.3; // 30% default margin
          const providerServiceId = String(service.service);

          const serviceData = {
            name: service.name,
            description: service.description || service.name || 'No description available',
            platform,
            category: service.category || 'General',
            provider_id: providerId,
            provider_service_id: providerServiceId,
            provider_price: providerPrice,
            base_price: basePrice,
            min_quantity: parseInt(String(service.min)) || 100,
            max_quantity: parseInt(String(service.max)) || 50000,
            refill_supported: service.refill === true || service.refill === 'true',
            dripfeed_supported: service.dripfeed === true || service.dripfeed === 'true',
            is_active: true,
          };

          if (existingMap.has(providerServiceId)) {
            toUpdate.push({ ...serviceData, id: existingMap.get(providerServiceId) });
          } else {
            const internalServiceId = Math.floor(100 + Math.random() * 900);
            toInsert.push({ ...serviceData, service_id: internalServiceId });
          }
        }

        // Batch insert
        if (toInsert.length > 0) {
          const { error: insertErr } = await supabase.from('services').insert(toInsert);
          if (!insertErr) addedCount += toInsert.length;
          else console.error('Batch insert error:', insertErr);
        }

        // Batch update (upsert)
        for (const s of toUpdate) {
          const { id, ...updateData } = s;
          await supabase.from('services').update({
            provider_price: updateData.provider_price,
            base_price: updateData.base_price,
            min_quantity: updateData.min_quantity,
            max_quantity: updateData.max_quantity,
            refill_supported: updateData.refill_supported,
            dripfeed_supported: updateData.dripfeed_supported,
            is_active: true,
          }).eq('id', id);
          updatedCount++;
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

function detectPlatform(category: string, name: string): string {
  const text = (category + ' ' + name).toLowerCase();
  if (text.includes('instagram')) return 'Instagram';
  if (text.includes('youtube')) return 'YouTube';
  if (text.includes('tiktok') || text.includes('tik tok')) return 'TikTok';
  if (text.includes('telegram')) return 'Telegram';
  if (text.includes('twitter') || text.includes(' x ') || text.match(/\bx\b/)) return 'X';
  if (text.includes('facebook') || text.includes('fb ')) return 'Facebook';
  if (text.includes('spotify')) return 'Spotify';
  if (text.includes('discord')) return 'Discord';
  if (text.includes('twitch')) return 'Twitch';
  if (text.includes('snapchat')) return 'Snapchat';
  if (text.includes('whatsapp')) return 'WhatsApp';
  if (text.includes('threads')) return 'Threads';
  if (text.includes('linkedin')) return 'LinkedIn';
  if (text.includes('pinterest')) return 'Pinterest';
  if (text.includes('reddit')) return 'Reddit';
  if (text.includes('clubhouse')) return 'Clubhouse';
  if (text.includes('apple') || text.includes('itunes')) return 'Apple';
  return 'Other';
}
