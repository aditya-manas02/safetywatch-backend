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

const SYSTEM_PROMPT = `
You are the SafetyWatch Assistant. 
Help users with neighborhood safety, heatmaps, and incident reporting.
Be very concise. 
EMERGENCY: Tell them to call 911 immediately.
`;

router.post("/", chatLimiter, async (req, res) => {
  const { message, history } = req.body;

  if (!message) return res.status(400).json({ message: "Message is required" });

  try {
    // Trim key to prevent hidden space errors
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return res.status(500).json({ message: "AI disabled: GEMINI_API_KEY is missing/empty on the server." });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // We'll use the most standard model name
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Build parts including system prompt
    const chatHistory = [
        { role: "user", parts: [{ text: "Context: " + SYSTEM_PROMPT }] },
        { role: "model", parts: [{ text: "Understood. I am the SafetyWatch Assistant." }] },
        ...(history || []).map((msg) => ({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }],
        })),
    ];

    const chat = model.startChat({ history: chatHistory });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();

    res.json({ reply: text });

  } catch (error) {
    console.error("DIAGNOSTIC - GEMINI ERROR:", error);
    
    let userFriendlyMessage = "The AI is currently unavailable.";
    
    if (error.message?.includes("404") || error.message?.includes("not found")) {
        userFriendlyMessage = "Model 404: Google cannot find the model in your current region. Please check your Google AI Studio project settings.";
    } else if (error.message?.includes("403")) {
        userFriendlyMessage = "API Key Error: Access forbidden. Please check if your API key is restricted or expired.";
    }

    res.status(500).json({ 
      message: userFriendlyMessage,
      technical: error.message
    });
  }
});

export default router;
