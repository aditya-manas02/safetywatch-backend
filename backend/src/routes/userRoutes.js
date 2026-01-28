import express from "express";
import User from "../models/User.js";
import Incident from "../models/Incident.js";
import {
  authMiddleware,
  requireAdminOnly,
  requireSuperAdmin,
} from "../middleware/auth.js";

const router = express.Router();

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

    res.json({ message: "User deleted successfully" });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
