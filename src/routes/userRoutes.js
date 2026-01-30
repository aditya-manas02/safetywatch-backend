import express from "express";
import User from "../models/User.js";
import Incident from "../models/Incident.js";
import {
  authMiddleware,
  requireAdminOnly,
  requireSuperAdmin,
} from "../middleware/auth.js";
import { logAudit } from "../utils/auditLogger.js";

const router = express.Router();

/* UPDATE USER PROFILE (Self) */
router.patch("/profile", authMiddleware, async (req, res) => {
  try {
    const { name, phone } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (name) user.name = name;
    if (phone) user.phone = phone;

    await user.save();

    res.json({
      message: "Profile updated",
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        roles: user.roles,
      },
    });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

/* GET ALL USERS (Admin) */
router.get("/", authMiddleware, requireAdminOnly, async (req, res) => {
  try {
    const users = await User.find().select("-passwordHash");
    res.json(users);
  } catch {
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

export default router;
