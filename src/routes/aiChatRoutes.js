import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 15, // Slightly higher for smoother UX
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
      return res.status(500).json({ message: "AI disabled: GEMINI_API_KEY missing on Render." });
    }

    // Standard initialization
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Using a more robust model selection pattern
    const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
    });

    // Start chat with system prompt manually in history for maximum compatibility
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
    console.error("FINAL AI ERROR:", error);
    
    // If it's still a 404, suggest a fallback model name
    let errorMessage = error.message || "Unknown AI error";
    if (errorMessage.includes("404")) {
        errorMessage = "Google is having trouble finding the model. Please check the API key region permissions.";
    }

    res.status(500).json({ 
      message: "AI Failure: " + errorMessage
    });
  }
});

export default router;
