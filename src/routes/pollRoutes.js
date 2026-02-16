import express from "express";
import Poll from "../models/Poll.js";
import { authMiddleware, requireAdminOnly } from "../middleware/auth.js";
import { catchAsync } from "../utils/catchAsync.js";

const router = express.Router();

/* ---------------- CREATE POLL (ADMIN ONLY) ---------------- */
router.post("/", authMiddleware, requireAdminOnly, catchAsync(async (req, res) => {
  const { question, options, areaCode, expiresAt } = req.body;

  if (!question || !options || !Array.isArray(options) || options.length < 2) {
    return res.status(400).json({ message: "Question and at least 2 options are required" });
  }

  const poll = await Poll.create({
    question,
    options: options.map(opt => ({ text: opt, votes: [] })),
    areaCode: areaCode || req.user.areaCode,
    createdBy: req.user.id,
    expiresAt: expiresAt ? new Date(expiresAt) : undefined
  });

  res.status(201).json(poll);
}));

/* ---------------- GET ACTIVE POLLS FOR AREA ---------------- */
router.get("/", authMiddleware, catchAsync(async (req, res) => {
  const areaCode = req.query.areaCode || req.user.areaCode;
  
  const polls = await Poll.find({ 
    areaCode, 
    isActive: true,
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ]
  }).sort({ createdAt: -1 });

  res.json(polls);
}));

/* ---------------- VOTE IN POLL ---------------- */
router.patch("/:id/vote", authMiddleware, catchAsync(async (req, res) => {
  const { optionIndex } = req.body;
  const poll = await Poll.findById(req.params.id);

  if (!poll) return res.status(404).json({ message: "Poll not found" });
  if (!poll.isActive) return res.status(400).json({ message: "Poll is no longer active" });
  if (poll.expiresAt && poll.expiresAt < new Date()) {
    poll.isActive = false;
    await poll.save();
    return res.status(400).json({ message: "Poll has expired" });
  }

  const userId = req.user.id;

  // Check if user already voted in any option
  const hasVoted = poll.options.some(opt => opt.votes.some(v => v.toString() === userId.toString()));
  if (hasVoted) {
    return res.status(400).json({ message: "You have already voted in this poll" });
  }

  if (optionIndex < 0 || optionIndex >= poll.options.length) {
    return res.status(400).json({ message: "Invalid option index" });
  }

  poll.options[optionIndex].votes.push(userId);
  await poll.save();

  res.json({ message: "Vote cast successfully", poll });
}));

export default router;
