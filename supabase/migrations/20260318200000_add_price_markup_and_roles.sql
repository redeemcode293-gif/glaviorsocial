-- Add price_markup column to profiles for secondary admin hidden markup
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS price_markup NUMERIC NOT NULL DEFAULT 1.0;

-- Allow owner to update any profile (including price_markup)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='Owner can update any profile') THEN
    CREATE POLICY "Owner can update any profile" ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(), 'owner'));
  END IF;
END $$;
