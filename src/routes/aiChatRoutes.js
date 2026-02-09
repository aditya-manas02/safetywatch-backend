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
    const modelsToTry = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"];
    let lastError = null;

    for (const modelName of modelsToTry) {
        try {
            console.log(`[AI] Attempting ${modelName}...`);
            model = genAI.getGenerativeModel({ model: modelName });
            
            // Try structured chat first
            const chat = model.startChat({
                history: [
                    { role: "user", parts: [{ text: "System Protocol: Act as Nexus AI, the neighborhood security core. Keep responses concise. " + SYSTEM_PROMPT }] },
                    { role: "model", parts: [{ text: "Understood." }] },
                    ...(history || []).map((msg) => ({
                        role: msg.role === "user" ? "user" : "model",
                        parts: [{ text: msg.content }],
                    })),
                ],
            });

            const result = await chat.sendMessage(message);
            const response = await result.response;
            console.log(`[AI] SUCCESS with ${modelName}`);
            return res.json({ reply: response.text() });
        } catch (err) {
            console.warn(`[AI] ${modelName} failed:`, err.message);
            lastError = err;
            
            // If it's a 404, we continue to the next model
            // If it's a 429, we might want to wait, but for now we follow through
        }
    }

    // FINAL FALLBACK: Simple generateContent (no history/complex structure)
    try {
        console.log("[AI] Attempting Final Simple Fallback...");
        const simpleModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await simpleModel.generateContent(`Nexus AI context: ${SYSTEM_PROMPT}\nUser: ${message}`);
        const response = await result.response;
        return res.json({ reply: response.text() });
    } catch (finalErr) {
        console.error("STABLE API ERROR (ALL FALLBACKS FAILED):", {
            message: finalErr.message,
            stack: finalErr.stack,
            original: lastError?.message
        });

        let msg = finalErr.message || "Unknown error";
        if (msg.includes("404")) {
            msg = "Models not found. This usually means the 'Generative AI API' is not enabled in your Google Cloud Project or the API Key is restricted. Please check your Google Cloud Console.";
        }

        res.status(500).json({ message: "AI Maintenance: " + msg });
    }
  } catch (error) {
    // This catch block handles errors from the initial API key check or other unexpected issues
    console.error("General API Error:", error);
    res.status(500).json({ message: "An unexpected error occurred: " + error.message });
  }
});

export default router;
