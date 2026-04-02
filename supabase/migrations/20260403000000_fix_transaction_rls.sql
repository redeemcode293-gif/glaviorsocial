-- Remove overlapping policies if any exist
DROP POLICY IF EXISTS "Admins can manage any transactions" ON "public"."transactions";
DROP POLICY IF EXISTS "Admins can view all transactions" ON "public"."transactions";
DROP POLICY IF EXISTS "Admins can update all transactions" ON "public"."transactions";

-- Enable read/write access to any transaction for admins and owners
CREATE POLICY "Admins can manage any transactions"
ON "public"."transactions"
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND role IN ('admin', 'owner')
  )
);
