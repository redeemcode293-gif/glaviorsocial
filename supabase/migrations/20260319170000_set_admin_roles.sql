-- Set simplesaluja25@gmail.com as OWNER (top-level admin)
-- Set samgho54@gmail.com as ADMIN (secondary admin)
DO $$
DECLARE
  v_owner_id uuid;
  v_admin_id uuid;
BEGIN
  -- Lookup owner by email
  SELECT id INTO v_owner_id FROM auth.users WHERE email = 'simplesaluja25@gmail.com' LIMIT 1;

  IF v_owner_id IS NOT NULL THEN
    DELETE FROM public.user_roles WHERE user_id = v_owner_id;
    INSERT INTO public.user_roles (user_id, role) VALUES (v_owner_id, 'owner');
    RAISE NOTICE 'Set simplesaluja25@gmail.com as owner (user_id: %)', v_owner_id;
  ELSE
    RAISE WARNING 'simplesaluja25@gmail.com not found in auth.users — make sure this account has registered first.';
  END IF;

  -- Lookup secondary admin by email
  SELECT id INTO v_admin_id FROM auth.users WHERE email = 'samgho54@gmail.com' LIMIT 1;

  IF v_admin_id IS NOT NULL THEN
    DELETE FROM public.user_roles WHERE user_id = v_admin_id;
    INSERT INTO public.user_roles (user_id, role) VALUES (v_admin_id, 'admin');
    RAISE NOTICE 'Set samgho54@gmail.com as admin (user_id: %)', v_admin_id;
  ELSE
    RAISE WARNING 'samgho54@gmail.com not found in auth.users — make sure this account has registered first.';
  END IF;
END;
$$;
