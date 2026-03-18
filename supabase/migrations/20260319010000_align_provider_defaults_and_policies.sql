-- Supplemental follow-up migration; do not rewrite prior files.
-- Note: 20260319000000_fix_prices_div92000.sql is the correct repair for already-corrupted
-- price data created by the older divide-by-92 logic. The earlier migration should not be used
-- to repair data that was inflated by INR_rate * 1000 storage.

-- Align new provider records with the intended INR-first workflow.
ALTER TABLE public.api_providers
  ALTER COLUMN currency SET DEFAULT 'INR';

-- Ensure API key lifecycle policies cover self-service deletion.
DROP POLICY IF EXISTS "Users can delete their own api keys" ON public.api_keys;
CREATE POLICY "Users can delete their own api keys" ON public.api_keys
  FOR DELETE USING (auth.uid() = user_id);

-- Reset wallet insert policy so signup-triggered wallet creation is not blocked by auth.uid() context.
DROP POLICY IF EXISTS "System can insert wallets" ON public.wallets;
CREATE POLICY "System can insert wallets" ON public.wallets
  FOR INSERT WITH CHECK (true);

-- Expand allowed order statuses for provider sync edge cases.
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
  CHECK (
    status IN (
      'pending',
      'processing',
      'in_progress',
      'completed',
      'failed',
      'partial',
      'cancelled',
      'refunded'
    )
  );

-- Backfill supporting indexes from the schema spec.
CREATE INDEX IF NOT EXISTS idx_orders_status
  ON public.orders(status);

CREATE INDEX IF NOT EXISTS idx_orders_user_id
  ON public.orders(user_id);

CREATE INDEX IF NOT EXISTS idx_orders_provider_order_id
  ON public.orders(provider_order_id);

CREATE INDEX IF NOT EXISTS idx_services_base_price
  ON public.services(base_price);

CREATE INDEX IF NOT EXISTS idx_panel_services_price
  ON public.panel_services(price);
