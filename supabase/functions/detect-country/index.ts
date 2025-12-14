import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get client IP from headers
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
                     req.headers.get("cf-connecting-ip") ||
                     req.headers.get("x-real-ip") ||
                     "unknown";

    // Use ip-api.com for free geolocation (no API key needed)
    const geoResponse = await fetch(`http://ip-api.com/json/${clientIP}?fields=status,country,countryCode`);
    
    if (!geoResponse.ok) {
      throw new Error("Failed to fetch geolocation");
    }

    const geoData = await geoResponse.json();

    if (geoData.status === "success") {
      return new Response(
        JSON.stringify({
          country: geoData.country,
          countryCode: geoData.countryCode,
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200 
        }
      );
    }

    // Fallback if IP lookup fails
    return new Response(
      JSON.stringify({
        country: "Unknown",
        countryCode: "XX",
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
  } catch (error) {
    console.error("Error detecting country:", error);
    return new Response(
      JSON.stringify({
        country: "Unknown", 
        countryCode: "XX",
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
  }
});
