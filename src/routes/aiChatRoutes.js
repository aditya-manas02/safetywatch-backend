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

const SYSTEM_PROMPT = "You are Nexus AI, the security assistant of SafetyWatch. CRITICAL INSTRUCTION: You MUST ONLY answer questions related to the SafetyWatch application, neighborhood safety, incident reporting, and security. If the user asks about ANY other off-topic subjects (e.g., coding, general knowledge, recipes, jokes, writing essays), you MUST refuse to answer politely and remind them of your specific purpose. Keep your answers concise and helpful.";


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
    // CONFIRMED STABLE MODELS
    const modelsToTry = [
        "gemini-1.5-flash",
        "gemini-1.5-pro",
        "gemini-2.0-flash"
    ];
    let lastError = null;

    for (const modelName of modelsToTry) {
        try {
            console.log(`[AI] Attempting ${modelName}...`);
            model = genAI.getGenerativeModel({ 
                model: modelName,
                generationConfig: { maxOutputTokens: 1000 } // Limit output to save tokens
            });
            
            // Limit history to the last 4 messages to save input tokens
            const recentHistory = (history || []).slice(-4);
            
            // Try structured chat first
            const chat = model.startChat({
                history: [
                    { role: "user", parts: [{ text: "System Protocol: Execute Nexus AI Core Personality Matrix. " + SYSTEM_PROMPT }] },
                    { role: "model", parts: [{ text: "Protocol accepted. Nexus AI online. I only answer questions related to SafetyWatch and neighborhood safety. How may I assist?" }] },
                    ...recentHistory.map((msg) => ({
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
        const recentHistory = (history || []).slice(-4);
        const historyText = recentHistory.map(m => `${m.role}: ${m.content}`).join('\n');
        
        const restUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        const restResponse = await fetch(restUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `Nexus Assistant Core Protocol: ${SYSTEM_PROMPT}\n\nRecent Context:\n${historyText}\n\nSecurity Inquiry from User: ${message}` }] }],
                generationConfig: { maxOutputTokens: 1000 }
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
        // Log the full technical error to server console ONLY
        console.error("STABLE API ERROR (REST FALLBACK ALSO FAILED):", {
            message: restErr.message,
            sdkError: lastError?.message,
            apiKeySuffix: apiKey.slice(-4)
        });

        // Send a generic, professional message to the user, but include a hint of the actual error for debugging
        res.status(500).json({ 
            message: `AI Maintenance: The Nexus AI core is temporarily offline. Error hint: ${lastError?.message || restErr.message || 'Unknown'}. Please try again later.` 
        });
    }
  } catch (error) {
    console.error("General AI Route Error:", error);
    res.status(500).json({ 
        message: "Nexus AI Core Exception: A system error occurred. Our engineers have been notified." 
    });
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
