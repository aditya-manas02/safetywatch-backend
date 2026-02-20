import express from "express";
import Content from "../models/Content.js";
import { catchAsync } from "../utils/catchAsync.js";

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

export default router;
