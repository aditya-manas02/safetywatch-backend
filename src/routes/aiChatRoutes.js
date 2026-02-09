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

    // Use the latest stable 1.5 Flash model
    const genAI = new GoogleGenerativeAI(apiKey);
    
    let model;
    try {
      // Try gemini-1.5-flash first
      model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const chat = model.startChat({
        history: [
          { role: "user", parts: [{ text: "System Protocol: Act as Nexus AI, the intelligent neighborhood security core. Keep responses concise, professional, and security-focused. " + SYSTEM_PROMPT }] },
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
    } catch (firstError) {
      console.warn("Flash model failed, trying fallback...", firstError.message);
      
      // Fallback to gemini-pro if Flash fails (or if it's a 404)
      try {
        model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const chatFallback = model.startChat({
          history: [
            { role: "user", parts: [{ text: SYSTEM_PROMPT }] },
            { role: "model", parts: [{ text: "Understood." }] }
          ]
        });
        const result = await chatFallback.sendMessage(message);
        const response = await result.response;
        return res.json({ reply: response.text() });
      } catch (finalError) {
        console.error("STABLE API ERROR:", finalError);
        
        let msg = finalError.message || "Unknown error";
        if (msg.includes("404")) {
            msg = "The API project configuration might be incorrect or models are still propagating. Please check your Google Cloud Console.";
        }
        res.status(500).json({ message: "AI Maintenance: " + msg });
      }
    }
  } catch (error) {
    // This catch block handles errors from the initial API key check or other unexpected issues
    console.error("General API Error:", error);
    res.status(500).json({ message: "An unexpected error occurred: " + error.message });
  }
});

export default router;
