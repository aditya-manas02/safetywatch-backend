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

// Diagnostic endpoint - check if Gemini API key is loaded and working
router.get("/ping", async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return res.status(500).json({ 
      status: "error", 
      reason: "GEMINI_API_KEY is not set in environment variables" 
    });
  }
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Say hello in one word.");
    const text = result.response.text().trim();
    return res.json({ status: "ok", keyPresent: true, geminiResponse: text });
  } catch (error) {
    return res.status(500).json({ 
      status: "error", 
      keyPresent: true, 
      reason: error.message 
    });
  }
});

router.post("/", translateLimiter, async (req, res) => {
  const { text, targetLanguage } = req.body;

  if (!text || !targetLanguage) {
    return res.status(400).json({ message: "Text and targetLanguage are required" });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return res.status(500).json({ message: "Translation disabled: API Key missing." });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Translate the following text into ${targetLanguage}. 
    Provide only the translated text, maintain the original tone, and ensure local context (Indian region) is respected if applicable.
    
    Text: "${text}"`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const translatedText = response.text().trim();

    return res.json({ translatedText });
  } catch (error) {
    console.error("Translation error:", error);
    res.status(500).json({ message: "Translation failed: " + error.message });
  }
});

router.post("/batch", translateLimiter, async (req, res) => {
  const { texts, targetLanguage } = req.body;

  if (!Array.isArray(texts) || !targetLanguage) {
    return res.status(400).json({ message: "Texts array and targetLanguage are required" });
  }

  if (targetLanguage === "en") {
    return res.json({ translatedTexts: texts });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return res.status(500).json({ message: "Translation disabled: API Key missing." });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Using JSON format for reliable batch extraction
    const prompt = `Translate this JSON array of strings into ${targetLanguage}. 
    Maintain the EXACT same array order and structure. 
    Respect local Indian context. 
    Return ONLY the translated JSON array.
    
    Strings: ${JSON.stringify(texts)}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text().trim();
    
    // Clean up markdown block if present
    if (text.startsWith("```json")) text = text.replace(/```json|```/g, "").trim();
    if (text.startsWith("```")) text = text.replace(/```/g, "").trim();

    const translatedTexts = JSON.parse(text);
    return res.json({ translatedTexts });
  } catch (error) {
    console.error("Batch translation error:", error);
    res.status(500).json({ message: "Batch translation failed: " + error.message });
  }
});

export default router;
