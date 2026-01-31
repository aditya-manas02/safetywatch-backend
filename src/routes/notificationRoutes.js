import express from "express";
import Notification from "../models/Notification.js";
import { authMiddleware, requireAdminOnly } from "../middleware/auth.js";
import { catchAsync } from "../utils/catchAsync.js";

const router = express.Router();

/* ----------------- GET NOTIFICATIONS ------------------ */
router.get("/", authMiddleware, catchAsync(async (req, res) => {
  // Fetch user specific notifications AND global announcements
  const notifications = await Notification.find({
    $or: [
      { userId: req.user.id },
      { userId: null }
    ]
  }).sort({ createdAt: -1 }).limit(50);

  res.json(notifications);
}));

/* ----------------- MARK AS READ ------------------ */
router.patch("/:id/read", authMiddleware, catchAsync(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.id },
    { isRead: true },
    { new: true }
  );
  
  if (!notification) {
    return res.status(404).json({ message: "Notification not found or is global" });
  }

  res.json(notification);
}));

/* ----------------- MARK ALL READ ------------------ */
router.patch("/read-all", authMiddleware, catchAsync(async (req, res) => {
  await Notification.updateMany(
    { userId: req.user.id, isRead: false },
    { isRead: true }
  );
  res.json({ message: "All notifications marked as read" });
}));

/* ----------------- CREATE ANNOUNCEMENT (ADMIN) ------------------ */
router.post("/announcement", authMiddleware, requireAdminOnly, catchAsync(async (req, res) => {
  const { title, message, link } = req.body;
  if (!title || !message) {
    return res.status(400).json({ message: "Title and message are required" });
  }

  const announcement = await Notification.create({
    userId: null,
    title,
    message,
    type: "announcement",
    link
  });

  res.status(201).json(announcement);
}));

export default router;
