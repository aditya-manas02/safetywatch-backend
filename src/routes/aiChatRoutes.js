import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// Rate limiting to protect your API quota
const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 15,
  message: { message: "Too many messages. Please wait a moment." },
});

const SYSTEM_PROMPT = `
You are the SafetyWatch Assistant. 
Help users with neighborhood safety, heatmaps, and incident reporting on the SafetyWatch website.
Be very concise, polite, and professional. 
IMPORTANT: If someone reports an emergency, tell them to call emergency services (like 911) immediately.
`;

router.post("/", chatLimiter, async (req, res) => {
  const { message, history } = req.body;

  if (!message) return res.status(400).json({ message: "Message is required" });

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: "AI not configured: GEMINI_API_KEY is missing in Render environment variables." });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // MODEL FALLBACK STRATEGY: 
    // We try the most efficient models first. If one is restricted in your region, we try the next.
    const modelNames = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-pro", "gemini-1.0-pro"];
    let lastError = null;

    for (const modelName of modelNames) {
      try {
        const model = genAI.getGenerativeModel({ 
          model: modelName,
          systemInstruction: SYSTEM_PROMPT 
        });

        // Test the model with the message
        const chat = model.startChat({
          history: (history || []).map((msg) => ({
            role: msg.role === "user" ? "user" : "model",
            parts: [{ text: msg.content }],
          })),
        });

        const result = await chat.sendMessage(message);
        const response = await result.response;
        const text = response.text();

        // If we reach here, it worked! Send the reply.
        return res.json({ reply: text });

      } catch (error) {
        console.warn(`Model ${modelName} failed:`, error.message);
        lastError = error;
        // Continue to the next model if it's a 404 or model not found error
        if (!error.message.includes("404") && !error.message.includes("not found")) {
            // If it's a different error (like quota or safety block), we stop and report it
            break;
        }
      }
    }

    // If all models failed
    console.error("ALL AI MODELS FAILED:", lastError);
    res.status(500).json({ 
      message: "SafetyWatch AI is temporarily unavailable in your region. Error: " + (lastError?.message || "All models returned 404"),
      type: "AI_CONFIG_ERROR"
    });

  } catch (globalError) {
    console.error("GLOBAL AI ROUTE ERROR:", globalError);
    res.status(500).json({ message: "The AI service encountered a critical error. Please try again later." });
  }
});

export default router;
