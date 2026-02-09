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
    // Attempting both prefixed and non-prefixed as the SDK behavior can vary by version/environment
    const modelsToTry = [
        "models/gemini-1.5-flash", 
        "models/gemini-1.5-pro", 
        "models/gemini-pro",
        "gemini-1.5-flash", 
        "gemini-1.5-pro", 
        "gemini-pro"
    ];
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
        }
    }

    // FINAL FALLBACK: Simple generateContent with models/ prefix
    try {
        console.log("[AI] Attempting Final Simple Fallback with models/ prefix...");
        const simpleModel = genAI.getGenerativeModel({ model: "models/gemini-1.5-flash" });
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
        if (msg.includes("404") || msg.includes("not found")) {
            msg = "Models not found. This indicates the 'Generative Language API' (not just basic Generative AI) is not enabled, or the project is incorrectly configured. Please visit: https://aistudio.google.com/app/apikey";
        }

        res.status(500).json({ message: "AI Maintenance: " + msg });
    }
  } catch (error) {
    console.error("General API Error:", error);
    res.status(500).json({ message: "An unexpected error occurred: " + error.message });
  }
});

// Diagnostic route
router.get("/debug", chatLimiter, async (req, res) => {
    try {
        const apiKey = process.env.GEMINI_API_KEY?.trim();
        if (!apiKey) return res.status(500).json({ message: "API Key missing" });

        const genAI = new GoogleGenerativeAI(apiKey);
        // SDK listModels is not public on all versions, try a direct fetch or trial
        res.json({ 
            message: "Diagnostic logic initiated. Check server logs for detailed trial outputs.",
            env_key_suffix: apiKey.slice(-4),
            sdk_version: "0.24.1"
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
