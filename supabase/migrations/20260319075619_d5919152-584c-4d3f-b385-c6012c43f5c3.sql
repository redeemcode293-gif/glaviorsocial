-- 1. Drop the overly-permissive user profile UPDATE policy
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- 2. Re-create a restricted policy: users may only update safe display fields
-- Privileged fields (vip_tier, custom_multiplier, pricing_override, status, referred_by)
-- can only be changed by admins/owners via their existing policies.
CREATE POLICY "Users can update safe profile fields"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND vip_tier        IS NOT DISTINCT FROM (SELECT vip_tier        FROM public.profiles WHERE user_id = auth.uid())
    AND custom_multiplier IS NOT DISTINCT FROM (SELECT custom_multiplier FROM public.profiles WHERE user_id = auth.uid())
    AND pricing_override IS NOT DISTINCT FROM (SELECT pricing_override FROM public.profiles WHERE user_id = auth.uid())
    AND status          IS NOT DISTINCT FROM (SELECT status          FROM public.profiles WHERE user_id = auth.uid())
    AND referred_by     IS NOT DISTINCT FROM (SELECT referred_by     FROM public.profiles WHERE user_id = auth.uid())
  );

-- 3. Hide provider_price from public on services table
REVOKE SELECT (provider_price) ON public.services FROM anon;
REVOKE SELECT (provider_price) ON public.services FROM authenticated;