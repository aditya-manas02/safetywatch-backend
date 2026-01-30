import express from "express";
import Incident from "../models/Incident.js";
import User from "../models/User.js";
import { authMiddleware, requireAdminOnly } from "../middleware/auth.js";
import { catchAsync } from "../utils/catchAsync.js";

const router = express.Router();

/* ============================================================
   🔒 ADMIN-ONLY DASHBOARD STATS
   GET /api/stats
   ============================================================ */
router.get("/", authMiddleware, requireAdminOnly, catchAsync(async (req, res) => {
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

  // --- BREAKDOWN BY DAY (Last 7 Days) ---
  const incidentsByDay = [];
  for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      
      const nextD = new Date(d);
      nextD.setDate(d.getDate() + 1);

      const count = await Incident.countDocuments({
          createdAt: { $gte: d, $lt: nextD }
      });

      incidentsByDay.push({
          date: d.toLocaleDateString('en-US', { weekday: 'short' }),
          count
      });
  }

  // --- TYPE DISTRIBUTION ---
  const typeDistribution = await Incident.aggregate([
      { $group: { _id: "$type", value: { $sum: 1 } } }
  ]).then(res => res.map(r => ({ name: r._id, value: r.value })));

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
    incidentsByDay,
    typeDistribution
  });
}));


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
