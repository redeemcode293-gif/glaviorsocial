-- Fix all prices that were stored as raw INR without dividing by 92
-- Safe to run: only touches prices > $50 which are impossible for real SMM

UPDATE public.services
SET
  base_price = base_price / 92,
  provider_price = CASE
    WHEN provider_price IS NOT NULL THEN provider_price / 92
    ELSE NULL
  END
WHERE base_price > 50;

UPDATE public.panel_services ps
SET price = s.base_price
FROM public.services s
WHERE ps.service_id = s.service_id
  AND ps.price > 50;

-- Verify: after this runs, no service should have price > 50
-- SELECT COUNT(*) FROM services WHERE base_price > 50; -- should return 0
