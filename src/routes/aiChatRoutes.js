import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 20,
  message: { message: "Too many messages. Please wait a moment." },
});

const SYSTEM_PROMPT = "You are the SafetyWatch Assistant. Help users with neighborhood safety, heatmaps, and incident reporting. Be concise.";

router.post("/", chatLimiter, async (req, res) => {
  const { message, history } = req.body;

  if (!message) return res.status(400).json({ message: "Message is required" });

  try {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return res.status(500).json({ message: "AI disabled: API Key missing on Render." });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // DYNAMIC MODEL SELECTION
    // We try these in order. Some regions restrict Flash-1.5 but allow Pro-1.5 or Pro-1.0
    const candidates = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"];
    let selectedModel = null;
    let lastErr = null;

    for (const name of candidates) {
        try {
            const m = genAI.getGenerativeModel({ model: name });
            // Test if it actually works with a very small prompt
            await m.generateContent({ contents: [{ role: 'user', parts: [{ text: 'hi' }] }] });
            selectedModel = m;
            console.log(`Successfully verified model: ${name}`);
            break;
        } catch (e) {
            console.warn(`Model ${name} is unavailable: ${e.message}`);
            lastErr = e;
        }
    }

    if (!selectedModel) {
        throw new Error(`No working models found. Last error: ${lastErr?.message}`);
    }

    const chat = selectedModel.startChat({
      history: [
        { role: "user", parts: [{ text: "Context: " + SYSTEM_PROMPT }] },
        { role: "model", parts: [{ text: "Understood." }] },
        ...(history || []).map((msg) => ({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }],
        })),
      ],
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    res.json({ reply: response.text() });

  } catch (error) {
    console.error("FINAL AI ERROR:", error);
    res.status(500).json({ 
      message: "AI Failure: " + (error.message || "Unknown error"),
      hint: "Check if 'Generative Language API' is enabled in your Google Cloud Project."
    });
  }
});

export default router;
