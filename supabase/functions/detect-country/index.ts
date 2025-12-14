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
    // Get client IP from headers (try multiple headers for reliability)
    const clientIP = req.headers.get("cf-connecting-ip") ||
                     req.headers.get("x-real-ip") ||
                     req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
                     "unknown";

    console.log("Detecting country for IP:", clientIP);

    // Primary: Use ip-api.com for free geolocation
    let geoData = null;
    
    try {
      const geoResponse = await fetch(`http://ip-api.com/json/${clientIP}?fields=status,country,countryCode`);
      if (geoResponse.ok) {
        geoData = await geoResponse.json();
        console.log("ip-api.com response:", geoData);
      }
    } catch (e) {
      console.log("ip-api.com failed, trying fallback:", e);
    }

    // If primary fails, try ipinfo.io as fallback
    if (!geoData || geoData.status !== "success") {
      try {
        const fallbackResponse = await fetch(`https://ipinfo.io/${clientIP}/json`);
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          console.log("ipinfo.io response:", fallbackData);
          if (fallbackData.country) {
            geoData = {
              status: "success",
              country: fallbackData.country,
              countryCode: fallbackData.country
            };
            // ipinfo returns country code, we need to map common ones
            const countryNames: Record<string, string> = {
              IN: "India", US: "United States", GB: "United Kingdom",
              CA: "Canada", AU: "Australia", DE: "Germany", FR: "France",
              BR: "Brazil", RU: "Russia", AE: "United Arab Emirates",
              SA: "Saudi Arabia", PK: "Pakistan", BD: "Bangladesh",
              ID: "Indonesia", PH: "Philippines", TH: "Thailand",
              VN: "Vietnam", MY: "Malaysia", TR: "Turkey", EG: "Egypt",
              NG: "Nigeria", ZA: "South Africa", MX: "Mexico", CO: "Colombia"
            };
            geoData.country = countryNames[fallbackData.country] || fallbackData.country;
            geoData.countryCode = fallbackData.country;
          }
        }
      } catch (e) {
        console.log("ipinfo.io also failed:", e);
      }
    }

    if (geoData && geoData.status === "success") {
      console.log("Final country detection:", geoData.country, geoData.countryCode);
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

    // Fallback if all IP lookups fail
    console.log("All geo services failed, returning Unknown");
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
