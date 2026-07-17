import express from "express";
import User from "../models/User.js";
import { sendTelegramMessage } from "../services/telegramService.js";

const router = express.Router();

// Webhook endpoint to receive messages from Telegram
router.post("/webhook", async (req, res) => {
  try {
    const update = req.body;
    
    // We only care about messages
    if (!update || !update.message || !update.message.text) {
      return res.status(200).send("OK");
    }

    const chatId = update.message.chat.id;
    const text = update.message.text.trim();

    // Check if it's a /start command with a payload
    if (text.startsWith("/start ")) {
      const linkCode = text.split(" ")[1];
      
      if (!linkCode) {
        await sendTelegramMessage(chatId, "Invalid setup link. Please use the exact link from the SafetyWatch app.");
        return res.status(200).send("OK");
      }

      // Find the user who has this emergency contact link code
      const user = await User.findOne({ "emergencyContacts.telegramLinkCode": linkCode });
      
      if (!user) {
        await sendTelegramMessage(chatId, "This link has expired or is invalid. Please generate a new one from the SafetyWatch app.");
        return res.status(200).send("OK");
      }

      // Find the specific contact in the array
      const contactIndex = user.emergencyContacts.findIndex(c => c.telegramLinkCode === linkCode);
      if (contactIndex === -1) return res.status(200).send("OK");

      const contact = user.emergencyContacts[contactIndex];
      
      // Prevent linking if already linked to a different chat
      if (contact.telegramChatId && contact.telegramChatId !== chatId.toString()) {
        await sendTelegramMessage(chatId, `This contact for ${user.name} is already linked to another Telegram account.`);
        return res.status(200).send("OK");
      }

      // Save the chat ID
      user.emergencyContacts[contactIndex].telegramChatId = chatId.toString();
      // Optionally clear the linkCode so it can't be reused, but leaving it is fine too
      
      await user.save();

      await sendTelegramMessage(chatId, `✅ <b>Success!</b>\n\nYou are now linked as an Emergency Contact for <b>${user.name}</b>.\nIf they trigger an SOS alert, you will instantly receive a notification right here.`);
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("[TELEGRAM_WEBHOOK] Error handling update:", error);
    res.status(500).send("Internal Server Error");
  }
});

export default router;
