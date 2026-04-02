import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { deposit, email } = await req.json();

    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const chatId = Deno.env.get("TELEGRAM_CHAT_ID");

    if (!botToken || !chatId) {
      console.log("Missing Telegram secrets");
      return new Response(JSON.stringify({ error: "Missing Telegram configuration" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200, // Returning 200 so UI doesn't crash
      });
    }

    const message = `🔔 *New Deposit Request*\n\nUser: ${email}\nAmount: *$${deposit.amount.toFixed(2)} USD* (₹${(deposit.amount * 92).toFixed(2)})\nMethod: ${deposit.payment_method}\nRef: ${deposit.reference_id || 'N/A'}\n\nDo you want to approve or reject this deposit?`;

    const telegramApi = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    // Add inline keyboard for accept/reject
    const keyboard = {
      inline_keyboard: [
        [
          { text: "✅ Accept", callback_data: `approve_deposit:${deposit.id}` },
          { text: "❌ Reject", callback_data: `reject_deposit:${deposit.id}` }
        ]
      ]
    };

    const response = await fetch(telegramApi, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "Markdown",
        reply_markup: keyboard
      })
    });

    const data = await response.json();
    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("notify-telegram error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
