-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Admins can view all profiles" ON "public"."profiles";
DROP POLICY IF EXISTS "Admins can view profiles" ON "public"."profiles";
DROP POLICY IF EXISTS "Profiles are viewable by admins" ON "public"."profiles";

-- Create a blanket policy for profiles
CREATE POLICY "Admins can view all profiles"
ON "public"."profiles"
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND role IN ('admin', 'owner')
  )
);

CREATE POLICY "Admins can update all profiles"
ON "public"."profiles"
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND role IN ('admin', 'owner')
  )
);

-- Do the same for wallets just in case
DROP POLICY IF EXISTS "Admins can view all wallets" ON "public"."wallets";

CREATE POLICY "Admins can view all wallets"
ON "public"."wallets"
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND role IN ('admin', 'owner')
  )
);

-- And transactions
DROP POLICY IF EXISTS "Admins can view all transactions" ON "public"."transactions";

CREATE POLICY "Admins can view all transactions"
ON "public"."transactions"
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND role IN ('admin', 'owner')
  )
);

-- Ensure user_roles are viewable by owner
DROP POLICY IF EXISTS "Owners can view all roles" ON "public"."user_roles";

CREATE POLICY "Owners can view all roles"
ON "public"."user_roles"
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'owner'
  )
);
