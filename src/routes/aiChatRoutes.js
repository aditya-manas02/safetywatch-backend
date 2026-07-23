import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 20,
  message: { message: "Too many messages. Please wait a moment." },
});

const SYSTEM_PROMPT = "You are SafetyWatch Buddy, the security assistant of SafetyWatch. CRITICAL INSTRUCTION: You MUST ONLY answer questions related to the SafetyWatch application, neighborhood safety, incident reporting, and security. If the user asks about ANY other off-topic subjects (e.g., coding, general knowledge, recipes, jokes, writing essays), you MUST refuse to answer politely and remind them of your specific purpose. Keep your answers concise and helpful. SPECIAL INSTRUCTION FOR APP USAGE: If someone asks how to use the app or any of its features (such as reporting incidents, SOS alerts, safety circles, heatmaps, guardian mode, etc.), first answer their question clearly, and at the very end of your response, state: \"You can also visit the How to Use section for detailed guides at path: /how-to-use (accessible via the navigation menu).\"";


router.post("/", chatLimiter, async (req, res) => {
  const { message, history } = req.body;

  if (!message) return res.status(400).json({ message: "Message is required" });

  try {
    const geminiKey = process.env.GEMINI_API_KEY?.trim();
    const grokKey = process.env.GROK_API_KEY?.trim();
    
    if (!geminiKey && !grokKey) {
      return res.status(500).json({ message: "AI disabled: API Keys missing on Render." });
    }

    let lastError = null;

    // --- PRIMARY AI: GROK ---
    if (grokKey) {
        try {
            console.log("[AI] Attempting Grok API (Primary)...");
            const openai = new OpenAI({
                apiKey: grokKey,
                baseURL: "https://api.x.ai/v1",
            });
            
            const openaiHistory = [
                { role: "system", content: "System Protocol: Execute SafetyWatch Buddy Personality Matrix. " + SYSTEM_PROMPT + "\nProtocol accepted. SafetyWatch Buddy online. I only answer questions related to SafetyWatch and neighborhood safety. How may I assist?" }
            ];
            
            const recentHistory = (history || []).slice(-4);
            for (const msg of recentHistory) {
                 openaiHistory.push({
                     role: msg.role === "user" ? "user" : "assistant",
                     content: msg.content
                 });
            }
            openaiHistory.push({ role: "user", content: message });
            
            const completion = await openai.chat.completions.create({
                model: "grok-2-latest",
                messages: openaiHistory,
                max_tokens: 1000
            });
            
            console.log("[AI] SUCCESS with Grok");
            return res.json({ reply: completion.choices[0].message.content });
        } catch (err) {
            console.warn("[AI] Grok failed:", err.message);
            lastError = err;
        }
    }

    // --- FALLBACK AI: GEMINI ---
    if (geminiKey) {
        console.warn("[AI] Grok exhausted/unavailable. Switching to Gemini Fallback...");
        const genAI = new GoogleGenerativeAI(geminiKey);
        
        const modelsToTry = [
            "gemini-flash-latest"
        ];

        for (const modelName of modelsToTry) {
            try {
                console.log(`[AI] Attempting ${modelName}...`);
                const model = genAI.getGenerativeModel({ 
                    model: modelName,
                    generationConfig: { maxOutputTokens: 1000 } 
                });
                
                const recentHistory = (history || []).slice(-4);
                const chat = model.startChat({
                    history: [
                        { role: "user", parts: [{ text: "System Protocol: Execute SafetyWatch Buddy Personality Matrix. " + SYSTEM_PROMPT }] },
                        { role: "model", parts: [{ text: "Protocol accepted. SafetyWatch Buddy online. I only answer questions related to SafetyWatch and neighborhood safety. How may I assist?" }] },
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
                console.warn(`[AI] Gemini ${modelName} failed:`, err.message);
                lastError = err;
            }
        }

        console.warn("[AI] Gemini SDK Methods exhausted. Attempting Direct REST API Bypassing SDK...");
        try {
            const recentHistory = (history || []).slice(-4);
            const historyText = recentHistory.map(m => `${m.role}: ${m.content}`).join('\n');
            
            const restUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`;
            const restResponse = await fetch(restUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: `SafetyWatch Buddy Protocol: ${SYSTEM_PROMPT}\n\nRecent Context:\n${historyText}\n\nSecurity Inquiry from User: ${message}` }] }],
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
            console.error("STABLE API ERROR (REST FALLBACK ALSO FAILED):", {
                message: restErr.message,
                sdkError: lastError?.message,
                apiKeySuffix: geminiKey.slice(-4)
            });
            lastError = restErr;
        }
    }

    // --- COMPLETE FAILURE ---
    res.status(500).json({ 
        message: "AI Maintenance: SafetyWatch Buddy is temporarily offline for security updates. Please try again later." 
    });
  } catch (error) {
    console.error("General AI Route Error:", error);
    res.status(500).json({ 
        message: "SafetyWatch Buddy Exception: A system error occurred. Our engineers have been notified." 
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
