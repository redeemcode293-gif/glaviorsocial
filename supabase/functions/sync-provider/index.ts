import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encryptApiKey, decryptApiKey } from "../_shared/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

function toUsd(raw: string | number): number {
  const value = parseProviderPrice(raw);
  if (value <= 0 || isNaN(value)) return 0;
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
    supabase.from('panel_services').select('id, provider_service_uuid, service_id').in('provider_service_uuid', providerServiceIds),
    supabase.from('panel_services').select('service_id').in('service_id', panelIds),
  ]);

  const panelByProvider = new Map((existingPanels || []).map((panel) => [panel.provider_service_uuid, panel as PanelServiceRecord]));
  const usedPanelIds = new Set<number>((collidingPanels || []).map((panel) => Number(panel.service_id)));
  const inserts: Array<Record<string, unknown>> = [];

  for (const service of services) {
    const existingPanel = panelByProvider.get(service.id);
    const payload = buildPanelServicePayload(service);

    if (existingPanel) {
      await supabase.from('panel_services').update(payload).eq('id', existingPanel.id);
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
    if (error) console.error('Panel service sync insert error:', error);
  }
}

function detectPlatform(category: string, name: string): string {
  const text = (category + ' ' + name).toLowerCase();
  if (text.includes('instagram') || text.includes(' ig ') || text.includes('igtv')) return 'Instagram';
  if (text.includes('youtube') || text.includes(' yt ')) return 'YouTube';
  if (text.includes('tiktok') || text.includes('tik tok')) return 'TikTok';
  if (text.includes('telegram') || text.includes(' tg ')) return 'Telegram';
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
  if (text.includes('apple') || text.includes('itunes') || text.includes('ios')) return 'Apple';
  if (text.includes('website') || text.includes('traffic') || text.includes('visitors')) return 'Websites';
  if (text.includes(' app ') || text.includes('app installs') || text.includes('play store')) return 'Apps';
  if (text.includes('seo') || text.includes('backlink')) return 'SEO/Backlinks';
  if (text.includes('blog')) return 'Blog';
  return 'Other';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 200, headers: corsHeaders });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 200, headers: corsHeaders });

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'owner'])
      .maybeSingle();

    if (!roleData) return new Response(JSON.stringify({ error: 'Admin access required' }), { status: 200, headers: corsHeaders });

    // ============================================================
    // THE FIX: Aggressive JSON parsing bypasses Deno strict type errors
    // ============================================================
    const rawText = await req.text();
    let body: any = {};
    try {
      body = JSON.parse(rawText);
    } catch (e) {
      console.error("Failed to parse body JSON, using empty object");
    }

    const providerId = body.providerId || body.id;

    if (!providerId) return new Response(JSON.stringify({ error: 'Provider ID missing in payload', received: rawText }), { status: 200, headers: corsHeaders });

    const { data: provider, error: providerError } = await supabase
      .from('api_providers')
      .select('*')
      .eq('id', providerId)
      .single();

    if (providerError || !provider) return new Response(JSON.stringify({ error: 'Provider not found' }), { status: 200, headers: corsHeaders });

    const providerApiKey = await decryptApiKey(provider.api_key);

    const response = await fetch(provider.api_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ key: providerApiKey, action: 'services' }),
      signal: AbortSignal.timeout(60000),
    });

    // X-RAY: Read the raw text from Mesumax before trying to parse it
    const rawProviderText = await response.text();
    console.log("Raw Mesumax Response:", rawProviderText);

    let services;
    try {
      services = JSON.parse(rawProviderText);
    } catch (e) {
      console.error("Mesumax returned non-JSON (likely Cloudflare or HTML error):", rawProviderText);
      return new Response(JSON.stringify({ 
        error: 'Provider API returned non-JSON', 
        mesumax_reply: rawProviderText.substring(0, 500) 
      }), { status: 200, headers: corsHeaders });
    }

    if (!Array.isArray(services)) {
      console.error("Mesumax returned JSON, but not a service list:", services);
      return new Response(JSON.stringify({ 
        error: 'Invalid response from provider API', 
        mesumax_reply: services 
      }), { status: 200, headers: corsHeaders });
    }

    let addedCount = 0;
    let updatedCount = 0;

    const BATCH_SIZE = 50;
    for (let i = 0; i < services.length; i += BATCH_SIZE) {
      const batch = services.slice(i, i + BATCH_SIZE) as ProviderServiceRecord[];
      const batchIds = batch.map((service) => String(service.service));
      
      const { data: existingServices } = await supabase
        .from('services')
        .select('id, provider_service_id, base_price')
        .eq('provider_id', providerId)
        .in('provider_service_id', batchIds);

      const existingMap = new Map((existingServices || []).map((service) => [service.provider_service_id, service]));

      const toInsert: Array<Record<string, unknown>> = [];
      const toUpdate: Array<Record<string, unknown>> = [];
      const currentBatchProviderIds: string[] = [];

      for (const service of batch) {
        const platform = detectPlatform(service.category || '', service.name || '');
        const providerPrice = toUsd(service.rate);
        
        // STORE PURE WHOLESALE. The 2.0x UI handles the profit dynamically.
        const basePrice = providerPrice; 
        const providerServiceId = String(service.service);

        if (providerPrice > MAX_SANE_USD || isNaN(providerPrice)) continue;

        currentBatchProviderIds.push(providerServiceId);

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

        const existing = existingMap.get(providerServiceId);
        if (existing) {
          toUpdate.push({ ...serviceData, id: existing.id });
        } else {
          toInsert.push({ ...serviceData, service_id: Math.floor(1000 + Math.random() * 9000) });
        }
      }

      if (toInsert.length > 0) {
        await supabase.from('services').insert(toInsert);
        addedCount += toInsert.length;
      }

      for (const s of toUpdate) {
        const { id, ...updateData } = s;
        await supabase.from('services').update(updateData).eq('id', id);
        updatedCount++;
      }

      if (currentBatchProviderIds.length > 0) {
        const { data: syncedServices } = await supabase
          .from('services')
          .select('id, service_id, name, description, platform, category, base_price, min_quantity, max_quantity, refill_supported, dripfeed_supported, is_active')
          .eq('provider_id', providerId)
          .in('provider_service_id', currentBatchProviderIds);

        if (syncedServices && syncedServices.length > 0) {
          await syncPanelServicesForProviderServices(supabase, syncedServices);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, added: addedCount, updated: updatedCount }), { headers: corsHeaders });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 200, headers: corsHeaders });
  }
});
