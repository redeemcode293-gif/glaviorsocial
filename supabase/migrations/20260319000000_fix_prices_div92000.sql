-- Fix prices that were stored as INR_rate × 1000 without ÷ 92
-- Correct formula: stored_wrong_price / 92000 = correct_USD_price
-- Safe threshold: no legitimate SMM service costs more than $10/1K USD

UPDATE public.services
SET
  provider_price = CASE
    WHEN provider_price IS NOT NULL THEN provider_price / 92000
    ELSE NULL
  END,
  base_price = base_price / 92000
WHERE base_price > 10;

UPDATE public.panel_services ps
SET price = s.base_price
FROM public.services s
WHERE ps.provider_service_uuid = s.id
  AND ps.price > 10;

-- Verify (should return 0 after running):
-- SELECT COUNT(*) FROM services WHERE base_price > 10;
-- SELECT COUNT(*) FROM panel_services WHERE price > 10;
