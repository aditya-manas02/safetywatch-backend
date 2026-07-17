import fetch from "node-fetch";

export const sendTelegramMessage = async (chatId, message) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("[TELEGRAM] Missing TELEGRAM_BOT_TOKEN in env");
    return { success: false, error: "Missing token" };
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML"
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error(`[TELEGRAM] Error sending message to ${chatId}:`, data);
      return { success: false, error: data.description };
    }

    console.log(`[TELEGRAM] Successfully sent alert to chat ${chatId}`);
    return { success: true, data };
  } catch (error) {
    console.error(`[TELEGRAM] Exception sending message to ${chatId}:`, error);
    return { success: false, error: error.message };
  }
};
