import express from "express";
import Content from "../models/Content.js";
import { catchAsync } from "../utils/catchAsync.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// GET all safety content
router.get("/", catchAsync(async (req, res) => {
  const content = await Content.find().sort({ createdAt: -1 });
  res.json({ content });
}));

// POST new safety content (Admin only in real world, but keeping simple for now)
router.post("/", catchAsync(async (req, res) => {
  const { title, body, category, author, icon } = req.body;
  const newContent = new Content({ title, body, category, author, icon });
  await newContent.save();
  res.status(201).json(newContent);
}));

// DELETE content
router.delete("/:id", catchAsync(async (req, res) => {
  await Content.findByIdAndDelete(req.params.id);
  res.json({ message: "Content deleted successfully" });
}));

// POST auto-generate safety content idea
router.post("/generate", catchAsync(async (req, res) => {
  const { category } = req.body; // e.g. "Tip", "Guide", "Announcement"

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return res.status(500).json({ message: "AI disabled: API Key missing." });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  
  let model;
  const modelsToTry = [
      "models/gemini-2.0-flash-lite",
      "models/gemini-2.0-flash",
      "models/gemini-flash-latest",
      "models/gemini-2.5-flash"
  ];
  let lastError = null;

  const prompt = `You are an expert community safety officer. Generate a completely random, fresh, and highly relevant safety ${category || 'Tip'} for a neighborhood watch app. 
Focus on a specific real-world topic (e.g. package theft, suspicious vehicles, fire hazards, severe weather, cyber safety, etc.).
DO NOT use markdown formatting outside of the JSON block. Return ONLY a valid JSON object with EXACTLY two keys: "title" (short, punchy, professional) and "body" (clear, actionable, 2-3 sentences).`;

  for (const modelName of modelsToTry) {
      try {
          model = genAI.getGenerativeModel({ 
            model: modelName,
            generationConfig: { responseMimeType: "application/json" }
          });
          
          const result = await model.generateContent(prompt);
          const text = result.response.text();
          
          let parsed;
          try {
             parsed = JSON.parse(text);
          } catch(e) {
             // Fallback regex if it wrapped in markdown despite mimeType
             const match = text.match(/```json\n([\s\S]*?)\n```/);
             if (match) parsed = JSON.parse(match[1]);
             else throw new Error("Could not parse JSON");
          }

          if (parsed && parsed.title && parsed.body) {
              return res.json(parsed);
          }
      } catch (err) {
          console.warn(`[SafetyContent AI] ${modelName} failed:`, err.message);
          lastError = err;
      }
  }

  throw new Error("Failed to generate AI content: " + lastError?.message);
}));

export default router;
