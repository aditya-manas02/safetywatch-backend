import express from "express";
import SupportMessage from "../models/SupportMessage.js";
import { authMiddleware, requireAdminOnly } from "../middleware/auth.js";
import { z } from "zod";
import { catchAsync } from "../utils/catchAsync.js";

const router = express.Router();

const messageSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email"),
  category: z.enum(["general", "feedback", "incident-help", "account-issue", "other"]),
  subject: z.string().min(3, "Subject is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

/* SUBMIT SUPPORT MESSAGE (Public/User) */
router.post("/", catchAsync(async (req, res) => {
  const validatedData = messageSchema.parse(req.body);
  
  const newMessage = await SupportMessage.create({
    ...validatedData,
    userId: req.headers.authorization ? req.body.userId : null,
  });

  res.status(201).json({ 
    message: "Your message has been received. We will get back to you soon!",
    messageId: newMessage._id
  });
}));

/* GET ALL SUPPORT MESSAGES (Admin Only) */
router.get("/", authMiddleware, requireAdminOnly, catchAsync(async (req, res) => {
  const messages = await SupportMessage.find().sort({ createdAt: -1 });
  res.json(messages);
}));

/* MARK AS READ/RESOLVED (Admin Only) */
router.patch("/:id", authMiddleware, requireAdminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    if (!["unread", "read", "resolved"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const updated = await SupportMessage.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Message not found" });

    res.json(updated);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

/* DELETE MESSAGE (Admin Only) */
router.delete("/:id", authMiddleware, requireAdminOnly, async (req, res) => {
  try {
    const deleted = await SupportMessage.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Message not found" });
    res.json({ message: "Message deleted" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
