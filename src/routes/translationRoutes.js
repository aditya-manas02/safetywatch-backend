import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

const translateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 500,
  message: { message: "Too many translation requests. Please wait a moment." },
});

const LANGUAGE_MAP = {
  "hi": "Hindi (हिन्दी)",
  "mr": "Marathi (मराठी)"
};

// Shared model list — gemini-2.5-flash confirmed available via /api/chat/debug
const MODELS_TO_TRY = [
  "models/gemini-2.0-flash-lite",
  "models/gemini-2.0-flash",
  "models/gemini-flash-latest",
  "models/gemini-2.5-flash",
  "models/gemini-pro-latest"
];

// Diagnostic endpoint — checks if key is present and a model works
router.get("/ping", async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return res.status(500).json({ status: "error", reason: "GEMINI_API_KEY is not set" });
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  
  let availableModels = [];
  try {
     const model = genAI.getGenerativeModel({ model: "models/gemini-2.0-flash-lite" });
     const result = await model.generateContent("ping");
     return res.json({ status: "ok", v: "1.4.7", model: "models/gemini-2.0-flash-lite", result: result.response.text() });
  } catch (err) {
    return res.status(500).json({ 
        status: "error", 
        v: "1.4.7",
        reason: "Direct ping failed", 
        error: err.message,
        triedModels: MODELS_TO_TRY
    });
  }
});

// Single translation
router.post("/", translateLimiter, async (req, res) => {
  const { text, targetLanguage } = req.body;

  if (!text || !targetLanguage) {
    return res.status(400).json({ message: "Text and targetLanguage are required" });
  }

  if (targetLanguage === "en") return res.json({ translatedText: text });

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return res.status(500).json({ message: "Translation disabled: API Key missing." });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const langName = LANGUAGE_MAP[targetLanguage] || targetLanguage;
  
  const prompt = `You are a professional translator specialized in the Indian region. 
Translate the following text accurately into ${langName}. 

Requirements:
1. Maintain the original tone and intent.
2. Use natural, conversational language commonly spoken in India (avoid overly formal words).
3. Ensure Indian regional context is respected.
4. Return ONLY the translated text.
  
Text: "${text}"`;

  let lastError = null;
  for (const modelName of MODELS_TO_TRY) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const translatedText = result.response.text().trim();
      return res.json({ translatedText });
    } catch (err) {
      console.warn(`[TRANSLATE] ${modelName} failed:`, err.message);
      lastError = err;
    }
  }

  res.status(500).json({ message: "Translation failed: " + lastError?.message });
});

// Batch translation
router.post("/batch", translateLimiter, async (req, res) => {
  const { texts, targetLanguage } = req.body;

  if (!Array.isArray(texts) || !targetLanguage) {
    return res.status(400).json({ message: "Texts array and targetLanguage are required" });
  }

  if (targetLanguage === "en") {
    return res.json({ translatedTexts: texts });
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return res.status(500).json({ message: "Translation disabled: API Key missing." });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const langName = LANGUAGE_MAP[targetLanguage] || targetLanguage;
  
  const prompt = `You are a professional translator specialized in the Indian region. 
Translate the following JSON array of strings into ${langName}.

Requirements:
1. Maintain the EXACT same array order and structure.
2. Use natural, conversational language common in India.
3. Return ONLY the translated JSON array as a raw string (no markdown blocks).
  
Strings: ${JSON.stringify(texts)}`;

  let lastError = null;
  for (const modelName of MODELS_TO_TRY) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      let text = result.response.text().trim();

      // Clean up markdown block and extract just the JSON array
      const firstBracket = text.indexOf('[');
      const lastBracket = text.lastIndexOf(']');
      
      if (firstBracket !== -1 && lastBracket !== -1 && lastBracket >= firstBracket) {
        text = text.substring(firstBracket, lastBracket + 1);
      } else {
        throw new Error("No JSON array returned by model for batch translation");
      }

      const translatedTexts = JSON.parse(text);
      return res.json({ translatedTexts });
    } catch (err) {
      console.warn(`[TRANSLATE/batch] ${modelName} failed:`, err.message);
      lastError = err;
    }
  }

  res.status(500).json({ message: "Batch translation failed: " + lastError?.message });
});

export default router;
