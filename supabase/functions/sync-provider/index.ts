import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encryptApiKey, decryptApiKey } from "../_shared/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_SANE_USD = 50000;

// ... [Types and Utility functions stay the same until Step 9] ...

// [REPLACE THE ENTIRE SYNC LOGIC IN THE 'services' ACTION SECTION]

    if (action === 'services') {
      const response = await fetch(provider.api_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ key: providerApiKey, action: 'services' }),
        signal: AbortSignal.timeout(60000),
      });

      const services = await response.json();

      if (!Array.isArray(services)) {
        return new Response(JSON.stringify({ error: 'Invalid services response', data: services }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      let addedCount = 0;
      let updatedCount = 0;
      const syncedProviderServiceIds: string[] = [];

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
        const insertedProviderServiceIds: string[] = [];

        for (const service of batch) {
          const platform = detectPlatform(service.category || '', service.name || '');
          const providerPrice = toUsd(service.rate);
          
          // THE 0.1% SYNC LOGIC:
          // If the service exists, we DO NOT overwrite the base_price (Sam's retail price).
          // We only set base_price for BRAND NEW services (Defaulting to 1.5x for safety).
          const existing = existingMap.get(String(service.service));
          const basePrice = existing ? existing.base_price : (providerPrice * 1.5); 

          const providerServiceId = String(service.service);

          if (providerPrice > MAX_SANE_USD || isNaN(providerPrice)) continue;

          const serviceData = {
            name: service.name,
            description: service.description || service.name || 'No description available',
            platform,
            category: service.category || 'General',
            provider_id: providerId,
            provider_service_id: providerServiceId,
            provider_price: providerPrice,
            base_price: basePrice, // Preserves Sam's price if existing
            min_quantity: parseInt(String(service.min)) || 100,
            max_quantity: parseInt(String(service.max)) || 50000,
            refill_supported: service.refill === true || service.refill === 'true',
            dripfeed_supported: service.dripfeed === true || service.dripfeed === 'true',
            is_active: true,
          };

          if (existing) {
            toUpdate.push({ ...serviceData, id: existing.id });
          } else {
            const internalServiceId = Math.floor(1000 + Math.random() * 9000);
            toInsert.push({ ...serviceData, service_id: internalServiceId });
            insertedProviderServiceIds.push(providerServiceId);
          }
        }

        // ... [Insert and Update logic continues as before] ...
