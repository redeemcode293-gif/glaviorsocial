-- Ensure panel_services has a unique service_id index for safer upserts
CREATE UNIQUE INDEX IF NOT EXISTS panel_services_service_id_unique_idx
  ON public.panel_services(service_id);

-- Add provider order tracking so provider status polling uses the real external order id
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS provider_order_id TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_provider_order_id
  ON public.orders(provider_order_id);

-- Keep server-side API key generation available while allowing client fallback
ALTER TABLE public.api_keys
  ALTER COLUMN api_key SET DEFAULT encode(extensions.gen_random_bytes(30), 'hex');

DROP POLICY IF EXISTS "Users can insert their own api keys" ON public.api_keys;
CREATE POLICY "Users can insert their own api keys" ON public.api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own api keys" ON public.api_keys;
CREATE POLICY "Users can update their own api keys" ON public.api_keys
  FOR UPDATE USING (auth.uid() = user_id);
