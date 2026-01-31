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

const SYSTEM_PROMPT = "You are the SafetyWatch Assistant. Help users with neighbor safety, heatmaps, and incident reporting. Be concise.";

router.post("/", chatLimiter, async (req, res) => {
  const { message, history } = req.body;

  if (!message) return res.status(400).json({ message: "Message is required" });

  try {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return res.status(500).json({ message: "AI disabled: API Key missing on Render." });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Try to get the model list to see what's actually available
    // This helps debug region-specific availability
    let modelToUse = "gemini-1.5-flash"; 
    
    try {
        // We try a direct call first
        const model = genAI.getGenerativeModel({ model: modelToUse });
        const chat = model.startChat({
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
        return res.json({ reply: response.text() });
    } catch (err) {
        console.error("Initial model failed, attempting discovery...", err.message);
        
        // Fallback to a super simple call with a different model name if Flash fails
        try {
            const fallbackModel = genAI.getGenerativeModel({ model: "gemini-pro" });
            const result = await fallbackModel.generateContent(SYSTEM_PROMPT + "\n\nUser: " + message);
            const response = await result.response;
            return res.json({ reply: response.text() });
        } catch (err2) {
            console.error("Discovery failed:", err2.message);
            throw new Error(`Google API returned 404 for all models. This usually means the 'Generative Language API' is not enabled for your API key project, or your region is restricted. Error: ${err2.message}`);
        }
    }

  } catch (error) {
    console.error("FINAL AI ERROR:", error);
    res.status(500).json({ 
      message: "AI Failure: " + (error.message || "Unknown error"),
      instruction: "Please ensure 'Generative Language API' is enabled in your Google Cloud Console for this project."
    });
  }
});

export default router;
