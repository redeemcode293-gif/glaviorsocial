import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import postgres from "https://deno.land/x/postgresjs/mod.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const dbUrl = Deno.env.get("SUPABASE_DB_URL");
    if (!dbUrl) {
      return new Response("No DB URL", { status: 500, headers: corsHeaders });
    }

    const sql = postgres(dbUrl);

    // Queries to fix profiles
    await sql`DROP POLICY IF EXISTS "Admins can view all profiles" ON "public"."profiles"`;
    await sql`DROP POLICY IF EXISTS "Admins can view profiles" ON "public"."profiles"`;
    await sql`DROP POLICY IF EXISTS "Profiles are viewable by admins" ON "public"."profiles"`;
    
    await sql`
      CREATE POLICY "Admins can view all profiles"
      ON "public"."profiles"
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM user_roles 
          WHERE user_roles.user_id = auth.uid() 
          AND role IN ('admin', 'owner')
        )
      )
    `;

    // Queries to fix transactions
    await sql`DROP POLICY IF EXISTS "Admins can view all transactions" ON "public"."transactions"`;
    await sql`
      CREATE POLICY "Admins can view all transactions"
      ON "public"."transactions"
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM user_roles 
          WHERE user_roles.user_id = auth.uid() 
          AND role IN ('admin', 'owner')
        )
      )
    `;

    await sql.end();

    return new Response(JSON.stringify({ success: true, message: "RLS updated" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Migration error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
