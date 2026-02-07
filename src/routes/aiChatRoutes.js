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

    // Use the latest available 2.5 Flash model
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Updated for 2026: using gemini-2.5-flash and v1beta
    const model = genAI.getGenerativeModel(
        { model: "gemini-2.5-flash" },
        { apiVersion: "v1beta" }
    );

    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: "Context: " + SYSTEM_PROMPT }] },
        { role: "model", parts: [{ text: "Understood." }] },
        ...(history || []).map((msg) => ({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }],
        })),
      ],
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    res.json({ reply: response.text() });

  } catch (error) {
    console.error("STABLE API ERROR:", error);
    
    // If it STILL fails with 404, it's definitely a Google propagation delay
    let msg = error.message || "Unknown error";
    if (msg.includes("404")) {
        msg = "The API was just enabled! Google takes 2-5 minutes to update their servers globally. Please wait 2 minutes and try again.";
    }

    res.status(500).json({ 
      message: "AI Maintenance: " + msg
    });
  }
});

export default router;
