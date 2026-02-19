import express from "express";
import User from "../models/User.js";
import Incident from "../models/Incident.js";
import {
  authMiddleware,
  requireAdminOnly,
  requireSuperAdmin,
} from "../middleware/auth.js";
import { logAudit } from "../utils/auditLogger.js";
import { catchAsync } from "../utils/catchAsync.js";

const router = express.Router();

import jwt from "jsonwebtoken";

/* GET USER PROFILE (Self) - SOFT AUTH FOR LEGACY COMPATIBILITY */
router.get("/profile", catchAsync(async (req, res) => {
  let user = null;
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      user = await User.findById(decoded.id).select("-passwordHash");
    }
  } catch (e) {
    // Ignore invalid token
  }

  if (!user) {
    // Return safe guest profile to prevent legacy crash 
    return res.json({ 
      name: "Guest", 
      email: "guest@safetywatch.app", 
      roles: ["guest"], 
      areaCode: "DEFAULT", 
      isVerified: false 
    });
  }
  res.json(user);
}));

/* UPDATE USER PROFILE (Self) */
router.patch("/profile", authMiddleware, catchAsync(async (req, res) => {
  const { name, phone, profilePicture } = req.body;
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  if (name) user.name = name;
  if (phone) user.phone = phone;
  if (profilePicture) user.profilePicture = profilePicture;

  await user.save();

  res.json({
    message: "Profile updated",
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      roles: user.roles,
      createdAt: user.createdAt,
      isVerified: user.isVerified,
      rewardPoints: user.rewardPoints,
      badges: user.badges
    },
  });
}));

/* GET ALL USERS (Admin) */
router.get("/", authMiddleware, requireAdminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const isSuperAdmin = user.roles.includes("superadmin");

    const query = {};
    
    // If NOT superadmin, filter by area code
    if (!isSuperAdmin) {
      if (!user.areaCode) {
        return res.status(400).json({ message: "Admin has no assigned area code" });
      }
      query.areaCode = user.areaCode;
    }

    const users = await User.find(query).select("-passwordHash");
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Server error" });
  }
});

/* GET USER INCIDENTS */
router.get("/:id/incidents", authMiddleware, requireAdminOnly, async (req, res) => {
  try {
    const incidents = await Incident.find({ userId: req.params.id });
    res.json(incidents);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

/* PROMOTE USER -> ADMIN */
router.patch("/:id/promote", authMiddleware, requireAdminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.roles.includes("admin")) user.roles.push("admin");

    await user.save();
    await logAudit(req, "Promoted user to admin", "user", req.params.id, user.email);
    res.json({ message: "Promoted", roles: user.roles });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

/* DEMOTE ADMIN -> USER (SUPERADMIN ONLY) */
router.patch("/:id/demote", authMiddleware, requireSuperAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.roles = user.roles.filter((r) => r !== "admin");
    await user.save();
    await logAudit(req, "Demoted admin to user", "user", req.params.id, user.email);
    res.json({ message: "Demoted", roles: user.roles });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

/* DELETE USER (SUPERADMIN ONLY + SELF-PROTECT) */
router.delete("/:id", authMiddleware, requireSuperAdmin, async (req, res) => {
  try {
    // 🚨 Prevent superadmin from deleting themselves
    if (req.user.id.toString() === req.params.id) {
      return res
        .status(400)
        .json({ message: "You cannot delete your own account" });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    await Incident.deleteMany({ userId: user._id });
    await user.deleteOne();

    await logAudit(req, "Deleted user profile and contributions", "user", req.params.id, user.email);
    res.json({ message: "User deleted successfully" });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

/* GET AUDIT LOGS (Admin Only) */
router.get("/audit/logs", authMiddleware, requireAdminOnly, async (req, res) => {
  try {
    const AuditLog = (await import("../models/AuditLog.js")).default;
    const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(100);
    res.json(logs);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

/* ADMIN: LIFT SUSPENSION (ADMIN ONLY) */
router.patch("/:id/unsuspend", authMiddleware, requireAdminOnly, catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  user.isSuspended = false;
  user.suspensionExpiresAt = undefined;
  await user.save();

  await logAudit(req, `Admin lifted suspension for user ${user.email}`, "admin_action", user._id);
  res.json({ message: "Suspension lifted successfully" });
}));

/* ADMIN: SUSPEND USER (ADMIN ONLY) */
router.patch("/:id/suspend", authMiddleware, requireAdminOnly, catchAsync(async (req, res) => {
  const { isSuspended, reason, suspensionDays } = req.body;
  const user = await User.findById(req.params.id);
  
  if (!user) return res.status(404).json({ message: "User not found" });
  if (user.roles.includes("superadmin")) {
    return res.status(403).json({ message: "SuperAdmins cannot be suspended" });
  }

  user.isSuspended = isSuspended;
  
  if (isSuspended) {
    if (suspensionDays) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(suspensionDays));
      user.suspensionExpiresAt = expiresAt;
    } else {
      user.suspensionExpiresAt = null; // Indefinite
    }
    
    if (reason) {
      user.warnings.push({
        reason,
        adminId: req.user.id
      });
    }

    await logAudit(req, `Admin suspended user ${user.email}. Reason: ${reason || 'Not specified'}`, "admin_action", user._id);
  } else {
    user.suspensionExpiresAt = undefined;
    await logAudit(req, `Admin lifted suspension for user ${user.email}`, "admin_action", user._id);
  }

  await user.save();

  // Send notification
  await (await import("../models/Notification.js")).default.create({
    userId: user._id,
    title: isSuspended ? "Account Suspended" : "Suspension Lifted",
    message: isSuspended 
      ? `Your account has been suspended${suspensionDays ? ` for ${suspensionDays} days` : ' indefinitely'}.${reason ? ` Reason: ${reason}` : ''}`
      : "Your account suspension has been lifted. You can now access all features.",
    type: "system_alert"
  });

  res.json({ message: isSuspended ? "User suspended successfully" : "Suspension lifted successfully" });
}));

const BADGE_COSTS = {
  "Community Vigilante": 100,
  "Safety Guardian": 500,
  "Area Sentinel": 1500,
  "Elite Protector": 5000,
  "Safety Legend": 15000
};

/* PURCHASE BADGE */
router.post("/badges/purchase", authMiddleware, catchAsync(async (req, res) => {
  const { badgeName } = req.body;
  const cost = BADGE_COSTS[badgeName];

  if (!cost) {
    return res.status(400).json({ message: "Invalid badge name" });
  }

  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  const isSuperAdmin = user.roles.includes("superadmin");

  // Check if user already has the badge
  if (user.badges.some(b => b.name === badgeName)) {
    return res.status(400).json({ message: "You already own this badge" });
  }

  // Check if user has enough points (bypass for super_admin)
  if (!isSuperAdmin && user.rewardPoints < cost) {
    return res.status(400).json({ message: `Insufficient points. You need ${cost} points.` });
  }

  // Deduct points (bypass for super_admin) and add badge
  if (!isSuperAdmin) {
    user.rewardPoints -= cost;
  }
  user.badges.push({ name: badgeName });

  await user.save();
  await logAudit(req, `Purchased badge: ${badgeName}`, "user_reward", user._id, `Cost: ${cost}`);

  res.json({
    message: `Successfully purchased ${badgeName}!`,
    rewardPoints: user.rewardPoints,
    badges: user.badges
  });
}));

export default router;
