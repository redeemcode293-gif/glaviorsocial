import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok");
  }

  try {
    const update = await req.json();

    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!botToken || !supabaseUrl || !supabaseServiceKey) {
      return new Response("Missing secrets", { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (update.callback_query) {
      const callbackQuery = update.callback_query;
      const data = callbackQuery.data; // "approve_deposit:UUID" or "reject_deposit:UUID"
      const chatId = callbackQuery.message.chat.id;
      const messageId = callbackQuery.message.message_id;

      if (data.startsWith("approve_deposit:") || data.startsWith("reject_deposit:")) {
        const [action, depositId] = data.split(":");
        const newStatus = action === "approve_deposit" ? "completed" : "rejected";

        // Query the deposit first to ensure it's still pending
        const { data: deposit, error: fetchErr } = await supabase
          .from("transactions")
          .select("*")
          .eq("id", depositId)
          .single();

        let responseText = "";

        if (fetchErr || !deposit) {
          responseText = "Deposit not found.";
        } else if (deposit.status !== "pending") {
          responseText = `Deposit was already ${deposit.status}.`;
        } else {
          // Update status
          const { error: updateErr } = await supabase
            .from("transactions")
            .update({ status: newStatus })
            .eq("id", depositId);

          if (updateErr) {
            responseText = "Failed to update deposit in DB.";
          } else {
            // Give user wallet balance if completed
            if (newStatus === "completed") {
              const { data: wallet } = await supabase
                .from("wallets")
                .select("balance")
                .eq("user_id", deposit.user_id)
                .single();

              if (wallet) {
                const newBalance = Number(wallet.balance) + Number(deposit.amount);
                await supabase
                  .from("wallets")
                  .update({ balance: newBalance })
                  .eq("user_id", deposit.user_id);
              }
            }
            responseText = `Deposit ${newStatus.toUpperCase()} successfully!`;
          }
        }

        // 1. Answer callback query
        await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            callback_query_id: callbackQuery.id,
            text: responseText
          })
        });

        // 2. Edit message text to remove buttons
        const originalText = callbackQuery.message.text;
        await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
            text: `${originalText}\n\n👉 *Status: ${newStatus.toUpperCase()}*`,
            parse_mode: "Markdown"
          })
        });
      }
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }
});
