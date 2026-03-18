-- Step 1: Add currency column to api_providers (default INR since most providers are Indian)
ALTER TABLE public.api_providers
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR';

-- Step 2: Fix any remaining corrupted INR prices in services (base_price > $50 means raw INR stored)
-- Only apply where the price is clearly wrong (> $50 but not NULL)
UPDATE public.services
SET
  base_price = base_price / 92,
  provider_price = CASE WHEN provider_price IS NOT NULL THEN provider_price / 92 ELSE NULL END
WHERE base_price > 50;

-- Step 3: Fix panel_services prices too
UPDATE public.panel_services
SET price = price / 92
WHERE price > 50;

-- Step 4: Missing api_keys INSERT policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'api_keys'
      AND policyname = 'Users can insert their own api keys'
  ) THEN
    EXECUTE '
      CREATE POLICY "Users can insert their own api keys" ON public.api_keys
        FOR INSERT WITH CHECK (auth.uid() = user_id)
    ';
  END IF;
END $$;

-- Step 5: Missing api_keys DELETE policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'api_keys'
      AND policyname = 'Users can delete their own api keys'
  ) THEN
    EXECUTE '
      CREATE POLICY "Users can delete their own api keys" ON public.api_keys
        FOR DELETE USING (auth.uid() = user_id)
    ';
  END IF;
END $$;

-- Step 6: Fix wallets INSERT policy for new user signups
DROP POLICY IF EXISTS "Users can insert own wallet" ON public.wallets;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'wallets'
      AND policyname = 'Service can insert wallets'
  ) THEN
    EXECUTE '
      CREATE POLICY "Service can insert wallets" ON public.wallets
        FOR INSERT WITH CHECK (true)
    ';
  END IF;
END $$;

-- Step 7: Add index on orders for faster stale order queries
CREATE INDEX IF NOT EXISTS idx_orders_status_provider_order_id
  ON public.orders (status, provider_order_id, created_at)
  WHERE status = 'pending';

-- Step 8: Add index on services for price sanity queries
CREATE INDEX IF NOT EXISTS idx_services_base_price
  ON public.services (base_price)
  WHERE base_price > 50;
