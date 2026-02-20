import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

const translateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  message: { message: "Too many translation requests. Please wait a moment." },
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

export default router;
