import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { encryptApiKey, decryptApiKey } from "../_shared/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only admin or owner
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "owner"])
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin or Owner access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    // ── CREATE provider ──
    if (action === "create") {
      const { name, api_url, api_key, currency } = body;
      if (!name || !api_url || !api_key) {
        return new Response(JSON.stringify({ error: "name, api_url and api_key are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const encryptedKey = await encryptApiKey(api_key);
      const { data, error } = await supabase
        .from("api_providers")
        .insert({ name, api_url, api_key: encryptedKey, currency: currency || "USD" })
        .select("id, name, api_url, currency, status, balance, created_at, updated_at")
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, provider: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── UPDATE provider ──
    if (action === "update") {
      const { id, name, api_url, api_key, currency } = body;
      if (!id) {
        return new Response(JSON.stringify({ error: "id is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const updates: Record<string, unknown> = {};
      if (name) updates.name = name;
      if (api_url) updates.api_url = api_url;
      if (api_key) updates.api_key = await encryptApiKey(api_key);
      if (currency) updates.currency = currency;

      const { data, error } = await supabase
        .from("api_providers")
        .update(updates)
        .eq("id", id)
        .select("id, name, api_url, currency, status, balance, created_at, updated_at")
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, provider: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── LIST providers (without api_key) ──
    if (action === "list") {
      const { data, error } = await supabase
        .from("api_providers")
        .select("id, name, api_url, currency, status, balance, last_sync_at, priority, created_at, updated_at")
        .order("priority", { ascending: true });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ providers: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ENCRYPT ALL existing plaintext keys (migration helper) ──
    if (action === "encrypt-existing") {
      // Only owner can run this
      const { data: ownerRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "owner")
        .maybeSingle();

      if (!ownerRole) {
        return new Response(JSON.stringify({ error: "Owner access required for bulk encryption" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: providers, error: fetchErr } = await supabase
        .from("api_providers")
        .select("id, api_key");

      if (fetchErr || !providers) {
        return new Response(JSON.stringify({ error: fetchErr?.message || "Failed to fetch providers" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let encrypted = 0;
      let skipped = 0;
      for (const provider of providers) {
        // Skip already-encrypted keys
        if (provider.api_key.startsWith("enc:")) {
          skipped++;
          continue;
        }
        const encryptedKey = await encryptApiKey(provider.api_key);
        await supabase
          .from("api_providers")
          .update({ api_key: encryptedKey })
          .eq("id", provider.id);
        encrypted++;
      }

      return new Response(JSON.stringify({ success: true, encrypted, skipped }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("manage-provider error", error);
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
