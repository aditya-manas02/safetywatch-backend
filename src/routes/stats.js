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
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(today.getDate() - 7);

    // 1. Incidents Today
    const incidentsToday = await Incident.countDocuments({
      createdAt: { $gte: today }
    });

    // 2. Active Alerts (Pending/Urgent)
    const activeAlerts = await Incident.countDocuments({
      status: "pending"
    });

    // 3. Active Users (Last 7 days)
    const activeUsers = await User.countDocuments({
       updatedAt: { $gte: oneWeekAgo }
    });

    // 4. Most Common Type (All Time - for context)
    const mostCommonAgg = await Incident.aggregate([
      { $group: { _id: "$type", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 }
    ]);
    const mostCommonType = mostCommonAgg[0]?.["_id"] || "General";

    res.json({
      incidentsToday,
      activeAlerts,
      activeUsers,
      mostCommonType
    });

  } catch (err) {
    console.error("Public stats error:", err);
    res.status(500).json({ message: "Error fetching public stats" });
  }
});

/* ============================================================
   💓 PULSE STATS (Live Ticker)
   GET /api/stats/pulse
   ============================================================ */
router.get("/pulse", async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const incidentsToday = await Incident.countDocuments({
      createdAt: { $gte: today },
      status: "approved" // Only count verified/approved incidents
    });

    // Dynamic Safety Score Calculation
    // Base: 100
    // Deduction: 2 points per incident today
    // Floor: 60 (to not scare people too much)
    const safetyScore = Math.max(60, 100 - (incidentsToday * 2));

    res.json({
      safetyScore,
      incidentsToday
    });

  } catch (err) {
    console.error("Pulse stats error:", err);
    // Fallback to safe defaults if DB fails
    res.json({ safetyScore: 98, incidentsToday: 0 });
  }
});

/* ============================================================
   🏆 GUARDIAN LEADERBOARD
   GET /api/stats/leaderboard
   Returns top 10 users ranked by approved reports
   ============================================================ */
router.get("/leaderboard", catchAsync(async (req, res) => {
  const leaderboard = await Incident.aggregate([
    { $match: { status: "approved" } },
    { $group: { 
        _id: "$userId", 
        reportCount: { $sum: 1 } 
      } 
    },
    { $sort: { reportCount: -1 } },
    { $limit: 10 },
    { $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "userDetails"
      }
    },
    { $unwind: "$userDetails" },
    { $project: {
        _id: 1,
        reportCount: 1,
        name: "$userDetails.name",
        profilePicture: "$userDetails.profilePicture",
        memberSince: "$userDetails.createdAt"
      }
    }
  ]);

  res.json(leaderboard);
}));

export default router;
