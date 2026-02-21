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

// Shared model list — gemini-2.5-flash confirmed available via /api/chat/debug
const MODELS_TO_TRY = [
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash-8b",
  "gemini-2.0-flash-exp",
  "models/gemini-2.0-flash",
  "models/gemini-1.5-flash",
  "models/gemini-pro",
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
     // Note: listModels might not be available on the main genAI object easily or might require different auth
     // but let's try at least to get a confirmed hit on one known model first
     const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
     const result = await model.generateContent("ping");
     return res.json({ status: "ok", model: "gemini-1.5-flash", result: result.response.text() });
  } catch (err) {
    return res.status(500).json({ 
        status: "error", 
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
  const prompt = `Translate the following text into ${targetLanguage}. 
  Provide only the translated text, maintain the original tone, and ensure local context (Indian region) is respected if applicable.
  
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
  const prompt = `Translate this JSON array of strings into ${targetLanguage}. 
  Maintain the EXACT same array order and structure. 
  Respect local Indian context. 
  Return ONLY the translated JSON array, with no extra text or markdown.
  
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
