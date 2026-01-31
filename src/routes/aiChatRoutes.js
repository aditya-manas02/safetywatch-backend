import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// Stricter rate limiting for AI to prevent abuse/costs
const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 messages per minute
  message: { message: "Too many requests from this IP, please try again in a minute." },
  standardHeaders: true,
  legacyHeaders: false,
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const SYSTEM_PROMPT = `
You are the "SafetyWatch Assistant", a helpful AI guide for the SafetyWatch community website. 
Your goal is to help users understand how to use the website and provide safety information.

Key Website Features:
- Incident Reporting: Users can report theft, vandalism, suspicious activity, assault, and other issues.
- Real-time Heatmap: Shows high-activity zones based on community reports.
- Community Groups: Users can join or create neighborhood watch groups.
- Dashboard: Admins view stats and moderate reports.
- Notifications: Users get alerts about their reports and community announcements.

Guidelines:
- If a user reports an active emergency, urge them to call local emergency services (e.g., 911 or local police) immediately.
- Be polite, concise, and community-focused.
- If you don't know an answer about the app, suggest they use the "Support" page.
- Explain that reports are moderated by community admins before appearing on the public heatmap.
`;

router.post("/", chatLimiter, async (req, res) => {
  const { message, history } = req.body;

  if (!message) {
    return res.status(400).json({ message: "Message is required" });
  }

  try {
    // If no API key, return a demo response
    if (!process.env.GEMINI_API_KEY) {
      return res.json({ 
        reply: "I'm currently in Demo Mode (API Key missing). I can tell you that SafetyWatch is a platform for community protection! Once my API key is set, I'll be able to answer all your specific questions." 
      });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Format history for Gemini
    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: SYSTEM_PROMPT }] },
        { role: "model", parts: [{ text: "Understood. I am the SafetyWatch Assistant. How can I help you today?" }] },
        ...(history || []).map((msg) => ({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }],
        })),
      ],
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();

    res.json({ reply: text });
  } catch (error) {
    console.error("AI Chat Error:", error);
    res.status(500).json({ message: "The AI is feeling a bit tired. Please try again in a moment." });
  }
});

export default router;
