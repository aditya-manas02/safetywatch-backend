import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 15,
  message: { message: "Too many messages. Please wait a moment." },
});

const SYSTEM_PROMPT = `
You are the SafetyWatch Assistant. 
Help users with neighborhood safety, heatmaps, and incident reporting.
Be very concise and helpful. 
If there is an emergency, tell them to call 911 immediately.
`;

router.post("/", chatLimiter, async (req, res) => {
  const { message, history } = req.body;

  if (!message) return res.status(400).json({ message: "Message is required" });

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: "AI disabled: GEMINI_API_KEY missing." });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Attempt to use 1.5 Flash (Cheapest/Fastest)
    // Fallback to gemini-pro if Flash is not available in the region
    let model;
    try {
        model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    } catch (e) {
        console.warn("Flash model failed to init, falling back to Pro");
        model = genAI.getGenerativeModel({ model: "gemini-pro" });
    }

    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: SYSTEM_PROMPT }] },
        { role: "model", parts: [{ text: "Understood. I'm ready to help SafetyWatch users." }] },
        ...(history || []).map((msg) => ({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }],
        })),
      ],
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();

    res.json({ reply: text });
  } catch (error) {
    console.error("AI CHAT ERROR:", error);
    
    // If Flash failed during sendMessage, try one more time with Pro directly
    if (error.message.includes("404") || error.message.includes("not found")) {
        try {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-pro" });
            const result = await model.generateContent(SYSTEM_PROMPT + "\n\nUser: " + message);
            const response = await result.response;
            return res.json({ reply: response.text() });
        } catch (innerError) {
            return res.status(500).json({ message: "AI Failure: " + innerError.message });
        }
    }

    res.status(500).json({ 
      message: "AI Failure: " + (error.message || "Unknown error")
    });
  }
});

export default router;
