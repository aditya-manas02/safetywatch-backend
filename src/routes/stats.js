import express from "express";
import Incident from "../models/Incident.js";
import User from "../models/User.js";
import { authMiddleware, requireAdminOnly } from "../middleware/auth.js";

const router = express.Router();

/* ============================================================
   🔒 ADMIN-ONLY DASHBOARD STATS
   GET /api/stats
   ============================================================ */
router.get("/", authMiddleware, requireAdminOnly, async (req, res) => {
  try {
    const now = new Date();

    // --- Last 7 Days ---
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(now.getDate() - 7);

    // --- Today ---
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Incidents This Week
    const incidentsThisWeek = await Incident.countDocuments({
      createdAt: { $gte: oneWeekAgo },
    });

    // Incidents Today
    const incidentsToday = await Incident.countDocuments({
      createdAt: { $gte: today },
    });

    // Active Users (updated in last 7 days)
    const activeUsers = await User.countDocuments({
      updatedAt: { $gte: oneWeekAgo },
    });

    // Most Common Incident Type
    const mostCommonAgg = await Incident.aggregate([
      { $group: { _id: "$type", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 }
    ]);

    const mostCommonType = mostCommonAgg[0]?.["_id"] || "N/A";

    // Old Stats
    const totalIncidents = await Incident.countDocuments();
    const pending = await Incident.countDocuments({ status: "pending" });
    const approved = await Incident.countDocuments({ status: "approved" });
    const rejected = await Incident.countDocuments({ status: "rejected" });
    const totalUsers = await User.countDocuments();

    res.json({
      totalIncidents,
      pending,
      approved,
      rejected,
      totalUsers,
      activeUsers,
      incidentsThisWeek,
      incidentsToday,
      mostCommonType,
    });

  } catch (err) {
    console.error("Admin stats error:", err);
    res.status(500).json({ message: "Error fetching dashboard stats" });
  }
});


/* ============================================================
   🌍 PUBLIC-HOMEPAGE STATS (NO AUTH REQUIRED)
   GET /api/stats/public
   Used by Hero.tsx (Homepage Live Overview)
   ============================================================ */
router.get("/public", async (req, res) => {
  try {
    const total = await Incident.countDocuments();
    const active = await Incident.countDocuments({ status: "pending" });
    const approved = await Incident.countDocuments({ status: "approved" });

    res.json({
      total,
      active,
      approved,
    });

  } catch (err) {
    console.error("Public stats error:", err);
    res.status(500).json({ message: "Error fetching public stats" });
  }
});

export default router;
