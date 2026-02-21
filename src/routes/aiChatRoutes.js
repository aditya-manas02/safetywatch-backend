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

const SYSTEM_PROMPT = "You are Nexus AI, the advanced security core of the SafetyWatch platform. Your communication protocols require you to be highly professional, authoritative yet helpful, and security-focused. Use precise language, maintain a calm and sophisticated demeanor, and provide expert guidance on neighborhood safety, incident reporting, and security analytics. Always prioritize user safety and data integrity in your advice.";


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
    // CONFIRMED MODELS from user diagnostics: gemini-2.5-flash, gemini-2.0-flash, gemini-flash-latest
    const modelsToTry = [
        "gemini-1.5-flash",
        "gemini-1.5-flash-8b",
        "gemini-2.0-flash-exp",
        "gemini-2.0-flash",
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
                    { role: "user", parts: [{ text: "System Protocol: Execute Nexus AI Core Personality Matrix. " + SYSTEM_PROMPT }] },
                    { role: "model", parts: [{ text: "Protocol accepted. Nexus AI online. How may I assist with the security of your community today?" }] },
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

    // FINAL CONSOLE LOG FOR RENDER
    console.warn("[AI] SDK Methods exhausted. Attempting Direct REST API Bypassing SDK...");

    // FINAL FALLBACK: Direct REST API 
    // This is the absolute cleanest way to call Gemini and will reveal the raw Google error.
    try {
        const restUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        const restResponse = await fetch(restUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `Nexus Assistant Core Protocol: ${SYSTEM_PROMPT}\n\nSecurity Inquiry from User: ${message}` }] }],
                generationConfig: { maxOutputTokens: 500 }
            })
        });

        const restData = await restResponse.json();
        
        if (restResponse.ok && restData.candidates?.[0]?.content?.parts?.[0]?.text) {
            console.log("[AI] REST API SUCCESS");
            return res.json({ reply: restData.candidates[0].content.parts[0].text });
        } else {
            console.error("[AI] REST API FAILED:", restData);
            throw new Error(restData.error?.message || "REST API returned empty response");
        }
    } catch (restErr) {
        console.error("STABLE API ERROR (REST FALLBACK ALSO FAILED):", {
            message: restErr.message,
            apiKeySuffix: apiKey.slice(-4)
        });

        let msg = restErr.message || "Unknown error";
        if (msg.includes("404") || msg.includes("not found")) {
            msg = "Models not accessible. This is usually caused by the 'Generative Language API' not being enabled in the Google Cloud Project. Please use AI Studio to generate a key: https://aistudio.google.com/app/apikey";
        }

        res.status(500).json({ message: "AI Maintenance: " + msg });
    }
  } catch (error) {
    console.error("General AI Route Error:", error);
    res.status(500).json({ message: "An unexpected error occurred: " + error.message });
  }
});

// Diagnostic route - Enhanced to list models
router.get("/debug", chatLimiter, async (req, res) => {
    try {
        const apiKey = process.env.GEMINI_API_KEY?.trim();
        if (!apiKey) return res.status(500).json({ message: "API Key missing" });

        // Try to list models via REST to see what's actually enabled
        const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const listRes = await fetch(listUrl);
        const listData = await listRes.json();

        res.json({ 
            status: listRes.ok ? "Success" : "Failed",
            key_suffix: apiKey.slice(-4),
            google_response: listData,
            advice: "If 'models' is empty or error is 404, enable the 'Generative Language API' in Google Cloud Console."
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
