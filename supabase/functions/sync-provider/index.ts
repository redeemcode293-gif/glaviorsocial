import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const INR_TO_USD = 1 / 92;
const MAX_SANE_USD = 50000;

type ProviderServiceRecord = {
  service: string | number;
  name: string;
  category: string;
  rate: string | number;
  min: string | number;
  max: string | number;
  refill?: boolean | string;
  dripfeed?: boolean | string;
  description?: string;
};

type StoredServiceRecord = {
  id: string;
  service_id: number;
  name: string;
  description: string | null;
  platform: string;
  category: string;
  base_price: number;
  min_quantity: number;
  max_quantity: number;
  refill_supported: boolean | null;
  dripfeed_supported: boolean | null;
  is_active: boolean;
};

type PanelServiceRecord = {
  id: string;
  provider_service_uuid: string;
  service_id: number;
};

/**
 * parseProviderPrice — handles INR lakh format (1,00,000.19), INR thousand format
 * (15,650.19), plain USD (0.50). Strips all currency symbols and removes ALL commas.
 */
function parseProviderPrice(raw: string | number): number {
  if (typeof raw === 'number') return isNaN(raw) ? 0 : raw;
  if (!raw) return 0;
  const stripped = String(raw).replace(/[₹Rs$€£\s]/gi, '').trim();
  const parts = stripped.split('.');
  let normalized: string;
  if (parts.length > 2) {
    const intPart = parts.slice(0, -1).join('').replace(/,/g, '');
    normalized = intPart + '.' + parts[parts.length - 1];
  } else {
    normalized = stripped.replace(/,/g, '');
  }
  const v = parseFloat(normalized);
  return isNaN(v) ? 0 : v;
}

/**
 * toUsd — converts provider price to USD.
 * - If currency is INR → divide by 92
 * - If value > 100 with any currency → heuristic: treat as INR, divide by 92
 * - Otherwise → treat as USD
 */
function toUsd(raw: string | number, currency?: string): number {
  const value = parseProviderPrice(raw);
  if (value <= 0 || isNaN(value)) return 0;
  const cur = (currency || 'USD').toUpperCase().trim();
  if (cur === 'INR' || cur === '₹' || cur === 'RS') return value * INR_TO_USD;
  if (value > 100) {
    console.warn(`[sync-provider] price ${value} for "${cur}" > 100 — treating as INR`);
    return value * INR_TO_USD;
  }
  return value;
}

function normalizeServiceText(value: string | null | undefined, fallback: string): string {
  return (value || fallback || 'General').trim();
}

function buildPanelServicePayload(service: StoredServiceRecord) {
  return {
    name: normalizeServiceText(service.name, 'Untitled Service'),
    description: service.description || service.name || 'No description available',
    platform: normalizeServiceText(service.platform, 'Other'),
    category: normalizeServiceText(service.category, 'General'),
    min_quantity: Number(service.min_quantity) || 100,
    max_quantity: Number(service.max_quantity) || 50000,
    price: Number(service.base_price) || 0,
    refill_supported: Boolean(service.refill_supported),
    dripfeed_supported: Boolean(service.dripfeed_supported),
    auto_refill_supported: false,
    is_visible: Boolean(service.is_active),
    provider_service_uuid: service.id,
  };
}

async function syncPanelServicesForProviderServices(supabase: ReturnType<typeof createClient>, services: StoredServiceRecord[]) {
  if (!services.length) return;

  const providerServiceIds = services.map((service) => service.id);
  const panelIds = services.map((service) => service.service_id);

  const [{ data: existingPanels }, { data: collidingPanels }] = await Promise.all([
    supabase
      .from('panel_services')
      .select('id, provider_service_uuid, service_id')
      .in('provider_service_uuid', providerServiceIds),
    supabase
      .from('panel_services')
      .select('service_id')
      .in('service_id', panelIds),
  ]);

  const panelByProvider = new Map((existingPanels || []).map((panel) => [panel.provider_service_uuid, panel as PanelServiceRecord]));
  const usedPanelIds = new Set<number>((collidingPanels || []).map((panel) => Number(panel.service_id)));
  const inserts: Array<Record<string, unknown>> = [];

  for (const service of services) {
    const existingPanel = panelByProvider.get(service.id);
    const payload = buildPanelServicePayload(service);

    if (existingPanel) {
      await supabase
        .from('panel_services')
        .update(payload)
        .eq('id', existingPanel.id);
      continue;
    }

    let nextPanelId = Number(service.service_id) || Math.floor(1000 + Math.random() * 9000);
    while (usedPanelIds.has(nextPanelId)) {
      nextPanelId += 1;
    }
    usedPanelIds.add(nextPanelId);

    inserts.push({
      service_id: nextPanelId,
      ...payload,
    });
  }

  if (inserts.length > 0) {
    const { error } = await supabase.from('panel_services').insert(inserts);
    if (error) {
      console.error('Panel service sync insert error:', error);
    }
  }
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
        const providerCurrencyForBalance = ((provider.currency as string) || 'INR').toUpperCase();
        const balanceUSD = toUsd(data.balance, providerCurrencyForBalance);
        await supabase
          .from('api_providers')
          .update({ balance: balanceUSD })
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
      const syncedProviderServiceIds: string[] = [];

      // Process in batches of 50 for performance
      const BATCH_SIZE = 50;
      for (let i = 0; i < services.length; i += BATCH_SIZE) {
        const batch = services.slice(i, i + BATCH_SIZE) as ProviderServiceRecord[];
        
        // Get existing services for this batch
        const batchIds = batch.map((service) => String(service.service));
        const { data: existingServices } = await supabase
          .from('services')
          .select('id, provider_service_id')
          .eq('provider_id', providerId)
          .in('provider_service_id', batchIds);

        const existingMap = new Map((existingServices || []).map((service) => [service.provider_service_id, service.id]));

        const toInsert: Array<Record<string, unknown>> = [];
        const toUpdate: Array<Record<string, unknown>> = [];
        const insertedProviderServiceIds: string[] = [];

        for (const service of batch) {
          const platform = detectPlatform(service.category || '', service.name || '');
          const providerPrice = toUsd(service.rate, provider.currency || 'USD');
          const basePrice = providerPrice * 1.3; // 30% default margin
          const providerServiceId = String(service.service);

          if (basePrice > MAX_SANE_USD || isNaN(basePrice)) {
            console.error(
              `PRICE SANITY FAIL: service ${service.service} "${service.name}", raw=${service.rate}, currency=${provider.currency || 'USD'}, panelUSD=${basePrice}. Skipping.`,
            );
            continue;
          }

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
            const internalServiceId = Math.floor(1000 + Math.random() * 9000);
            toInsert.push({ ...serviceData, service_id: internalServiceId });
            insertedProviderServiceIds.push(providerServiceId);
          }
        }

        // Batch insert
        if (toInsert.length > 0) {
          const { error: insertErr } = await supabase.from('services').insert(toInsert);
          if (!insertErr) {
            addedCount += toInsert.length;
            syncedProviderServiceIds.push(...insertedProviderServiceIds);
          } else {
            console.error('Batch insert error:', insertErr);
          }
        }

        // Batch update (upsert)
        for (const s of toUpdate) {
          const { id, ...updateData } = s;
          await supabase.from('services').update({
            name: updateData.name,
            description: updateData.description,
            platform: updateData.platform,
            category: updateData.category,
            provider_price: updateData.provider_price,
            base_price: updateData.base_price,
            min_quantity: updateData.min_quantity,
            max_quantity: updateData.max_quantity,
            refill_supported: updateData.refill_supported,
            dripfeed_supported: updateData.dripfeed_supported,
            is_active: true,
          }).eq('id', id);
          syncedProviderServiceIds.push(updateData.provider_service_id);
          updatedCount++;
        }
      }

      if (syncedProviderServiceIds.length > 0) {
        const { data: syncedServices, error: syncedServicesError } = await supabase
          .from('services')
          .select('id, service_id, name, description, platform, category, base_price, min_quantity, max_quantity, refill_supported, dripfeed_supported, is_active')
          .eq('provider_id', providerId)
          .in('provider_service_id', syncedProviderServiceIds);

        if (syncedServicesError) {
          console.error('Failed to load synced services for panel sync:', syncedServicesError);
        } else {
          await syncPanelServicesForProviderServices(supabase, syncedServices || []);
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
