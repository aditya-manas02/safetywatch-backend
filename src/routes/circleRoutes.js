import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import Circle from "../models/Circle.js";
import CircleSafetyStatus from "../models/CircleSafetyStatus.js";
import Incident from "../models/Incident.js";
import Notification from "../models/Notification.js";
import { catchAsync } from "../utils/catchAsync.js";
import crypto from "crypto";

const router = express.Router();

// Helper to generate a random 8-character invite code
const generateInviteCode = () => {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
};

/* ----------------- CREATE CIRCLE ------------------ */
router.post("/", authMiddleware, catchAsync(async (req, res) => {
  const { name, type } = req.body;

  if (!name || !type) {
    return res.status(400).json({ message: "Name and type are required" });
  }

  const inviteCode = generateInviteCode();

  const circle = await Circle.create({
    name,
    type,
    inviteCode,
    creator: req.user.id,
    members: [{ user: req.user.id, role: "admin" }]
  });

  // Initialize safety status for creator
  await CircleSafetyStatus.create({
    user: req.user.id,
    circle: circle._id,
    status: "Safe"
  });

  res.status(201).json(circle);
}));

/* ----------------- JOIN CIRCLE ------------------ */
router.post("/join", authMiddleware, catchAsync(async (req, res) => {
  const { inviteCode } = req.body;

  if (!inviteCode) {
    return res.status(400).json({ message: "Invite code is required" });
  }

  const circle = await Circle.findOne({ inviteCode: inviteCode.toUpperCase() });

  if (!circle) {
    return res.status(404).json({ message: "Invalid invite code" });
  }

  // Check if already a member
  const isMember = circle.members.some(m => m.user.toString() === req.user.id.toString());
  if (isMember) {
    return res.status(400).json({ message: "You are already a member of this circle" });
  }

  circle.members.push({ user: req.user.id, role: "member" });
  await circle.save();

  // Initialize safety status
  await CircleSafetyStatus.findOneAndUpdate(
    { user: req.user.id, circle: circle._id },
    { status: "Unknown", lastCheckIn: new Date() },
    { upsert: true, new: true }
  );

  res.json({ message: "Successfully joined the circle", circle });
}));

/* ----------------- LIST MY CIRCLES ------------------ */
router.get("/", authMiddleware, catchAsync(async (req, res) => {
  const circles = await Circle.find({ 
    "members.user": req.user.id 
  }).populate("members.user", "name profilePicture email");
  
  res.json(circles);
}));

/* ----------------- GET CIRCLE DETAILS ------------------ */
router.get("/:id", authMiddleware, catchAsync(async (req, res) => {
  const circle = await Circle.findById(req.params.id)
    .populate("members.user", "name profilePicture email phone")
    .populate({
      path: "sharedIncidents",
      populate: { path: "userId", select: "name profilePicture" }
    });

  if (!circle) {
    return res.status(404).json({ message: "Circle not found" });
  }

  // Check if member
  const isMember = circle.members.some(m => m.user._id.toString() === req.user.id.toString());
  if (!isMember) {
    return res.status(403).json({ message: "Access denied. You are not a member of this circle" });
  }

  // Get safety statuses for all members
  const memberIds = circle.members.map(m => m.user._id);
  const statuses = await CircleSafetyStatus.find({
    circle: circle._id,
    user: { $in: memberIds }
  }).populate("user", "name profilePicture");

  res.json({ circle, statuses });
}));

/* ----------------- UPDATE SAFETY STATUS ------------------ */
router.post("/:id/status", authMiddleware, catchAsync(async (req, res) => {
  const { status, note, latitude, longitude } = req.body;

  const circle = await Circle.findById(req.params.id);
  if (!circle) return res.status(404).json({ message: "Circle not found" });

  const isMember = circle.members.some(m => m.user.toString() === req.user.id.toString());
  if (!isMember) return res.status(403).json({ message: "Not a member" });

  const updateData = {
    status,
    note,
    lastCheckIn: new Date()
  };

  if (latitude && longitude) {
    updateData.location = {
      type: "Point",
      coordinates: [longitude, latitude]
    };
  }

  const safetyStatus = await CircleSafetyStatus.findOneAndUpdate(
    { user: req.user.id, circle: circle._id },
    updateData,
    { upsert: true, new: true }
  );

  // Notify circle members if status is "Need Help" or "In Danger"
  if (status === "Need Help" || status === "In Danger") {
    const user = await Circle.populate(circle, { path: "members.user", select: "name" });
    const senderName = user.members.find(m => m.user._id.toString() === req.user.id.toString())?.user?.name || "A member";
    
    const otherMembers = circle.members.filter(m => m.user.toString() !== req.user.id.toString());
    
    for (const member of otherMembers) {
      await Notification.create({
        userId: member.user,
        title: `CRITICAL: ${status} in ${circle.name}`,
        message: `${senderName} marked their status as ${status.toUpperCase()}. Check on them immediately.`,
        type: "system_alert",
        link: `/circles/${circle._id}`
      });
    }
  }

  res.json(safetyStatus);
}));

/* ----------------- SHARE INCIDENT TO CIRCLE ------------------ */
router.post("/:id/share-incident", authMiddleware, catchAsync(async (req, res) => {
  const { incidentId } = req.body;

  const circle = await Circle.findById(req.params.id);
  if (!circle) return res.status(404).json({ message: "Circle not found" });

  const isMember = circle.members.some(m => m.user.toString() === req.user.id.toString());
  if (!isMember) return res.status(403).json({ message: "Not a member" });

  const incident = await Incident.findById(incidentId);
  if (!incident) return res.status(404).json({ message: "Incident not found" });

  if (circle.sharedIncidents.includes(incidentId)) {
    return res.status(400).json({ message: "Incident already shared with this circle" });
  }

  circle.sharedIncidents.push(incidentId);
  await circle.save();

  // Notify members
  const otherMembers = circle.members.filter(m => m.user.toString() !== req.user.id.toString());
  for (const member of otherMembers) {
    await Notification.create({
      userId: member.user,
      title: `Alert shared in ${circle.name}`,
      message: `A new alert "${incident.title}" has been shared with your circle.`,
      type: "incident_update",
      link: `/circles/${circle._id}`
    });
  }

  res.json({ message: "Incident shared successfully" });
}));

/* ----------------- LEAVE CIRCLE ------------------ */
router.post("/:id/leave", authMiddleware, catchAsync(async (req, res) => {
  const circle = await Circle.findById(req.params.id);
  if (!circle) return res.status(404).json({ message: "Circle not found" });

  circle.members = circle.members.filter(m => m.user.toString() !== req.user.id.toString());
  
  if (circle.members.length === 0) {
    await Circle.findByIdAndDelete(req.params.id);
    await CircleSafetyStatus.deleteMany({ circle: req.params.id });
  } else {
    // If admin left, assign another admin if no admins left
    const hasAdmin = circle.members.some(m => m.role === "admin");
    if (!hasAdmin && circle.members.length > 0) {
      circle.members[0].role = "admin";
    }
    await circle.save();
    await CircleSafetyStatus.deleteOne({ user: req.user.id, circle: req.params.id });
  }

  res.json({ message: "Successfully left the circle" });
}));

export default router;
