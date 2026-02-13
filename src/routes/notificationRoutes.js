import express from "express";
import Notification from "../models/Notification.js";
import { authMiddleware, requireAdminOnly } from "../middleware/auth.js";
import { catchAsync } from "../utils/catchAsync.js";

const router = express.Router();

/* ----------------- GET PUBLIC ANNOUNCEMENTS ------------------ */
router.get("/public", catchAsync(async (req, res) => {
  // Only return global announcements (userId: null) from the last 48 hours
  const filterWindow = new Date(Date.now() - 48 * 60 * 60 * 1000);
  
  const announcements = await Notification.find({ 
    userId: null,
    createdAt: { $gte: filterWindow }
  })
    .sort({ createdAt: -1 })
    .limit(20);

  res.json(announcements);
}));

/* ----------------- GET NOTIFICATIONS (AUTH) ------------------ */
/* ----------------- GET NOTIFICATIONS (SOFT AUTH) ------------------ */
import jwt from "jsonwebtoken";

router.get("/", catchAsync(async (req, res) => {
  const { history } = req.query;
  const filterWindow = new Date(Date.now() - 48 * 60 * 60 * 1000);

  // SOFT AUTH CHECK
  let userId = null;
  let user = null;
  
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.id;
      // We could fetch the full user if needed, but for notifications this might be enough
      // For isAdmin check we need the user
      const User = (await import("../models/User.js")).default;
      user = await User.findById(userId);
    }
  } catch (e) {
    // Ignore invalid token, just treat as guest/global
  }

  // If auth failed, we can either return [] or just public notifications
  // Returning [] is safer for legacy crash prevention
  if (!userId || !user) {
     // OPTIONAL: We could return just public announcements here
     // But to be absolutely safe for legacy crashes, let's return []
     return res.json([]); 
  }

  let query = {
    $or: [
      { userId: userId },
      { userId: null }
    ]
  };

  // If not requesting history (or not admin), filter by 72h window
  if (history !== "true" || !user.roles.includes("admin")) {
    query.createdAt = { $gte: filterWindow };
  }

  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .limit(history === "true" ? 200 : 50);

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

/* ----------------- DELETE NOTIFICATION (ADMIN) ------------------ */
router.delete("/:id", authMiddleware, requireAdminOnly, catchAsync(async (req, res) => {
  const notification = await Notification.findByIdAndDelete(req.params.id);
  
  if (!notification) {
    return res.status(404).json({ message: "Notification not found" });
  }

  res.json({ message: "Notification deleted successfully" });
}));

export default router;
