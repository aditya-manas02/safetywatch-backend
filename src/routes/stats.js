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
  const user = await User.findById(req.user.id);
  const isSuperAdmin = user.roles.includes("superadmin");

  // Base Query: If not superadmin AND has areaCode, restrict to areaCode
  // If admin has no areaCode, show all stats (like superadmin) to prevent dashboard breakage
  const baseQuery = {};
  if (!isSuperAdmin && user.areaCode) {
    baseQuery.areaCode = user.areaCode;
  }

  const now = new Date();

  // --- Last 7 Days ---
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(now.getDate() - 7);

  // --- Today ---
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Incidents This Week
  const incidentsThisWeek = await Incident.countDocuments({
    ...baseQuery,
    createdAt: { $gte: oneWeekAgo },
  });

  // Incidents Today
  const incidentsToday = await Incident.countDocuments({
    ...baseQuery,
    createdAt: { $gte: today },
  });

  // Active Users (updated in last 7 days)
  const activeUsers = await User.countDocuments({
    ...baseQuery,
    updatedAt: { $gte: oneWeekAgo },
  });

  // Most Common Incident Type
  const mostCommonAgg = await Incident.aggregate([
    { $match: baseQuery },
    { $group: { _id: "$type", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 1 }
  ]);

  const mostCommonType = mostCommonAgg[0]?.["_id"] || "N/A";

  // Old Stats
  const totalIncidents = await Incident.countDocuments(baseQuery);
  const pending = await Incident.countDocuments({ ...baseQuery, status: "pending" });
  const approved = await Incident.countDocuments({ ...baseQuery, status: "approved" });
  const rejected = await Incident.countDocuments({ ...baseQuery, status: "rejected" });
  const totalUsers = await User.countDocuments(baseQuery);

  // --- BREAKDOWN BY DAY (Last 7 Days) ---
  const incidentsByDay = [];
  for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      
      const nextD = new Date(d);
      nextD.setDate(d.getDate() + 1);

      const count = await Incident.countDocuments({
          ...baseQuery,
          createdAt: { $gte: d, $lt: nextD }
      });

      incidentsByDay.push({
          date: d.toLocaleDateString('en-US', { weekday: 'short' }),
          count
      });
  }

  // --- TYPE DISTRIBUTION ---
  const typeDistribution = await Incident.aggregate([
      { $match: baseQuery },
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

import jwt from "jsonwebtoken";

/* ============================================================
   🏆 GUARDIAN LEADERBOARD (SOFT AUTH)
   GET /api/stats/leaderboard
   ============================================================ */
router.get("/leaderboard", catchAsync(async (req, res) => {
  let { lat, lng, radius = 10, userId } = req.query; // radius in km
  
  // SOFT AUTH: Extract userId from token if present
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (!userId) userId = decoded.id;
    }
  } catch (e) {
    // Treat as guest
  }
  
  const pipeline = [];
  const baseMatch = { status: "approved" };

  // 1. Setup Base Pipeline (Geo or Match)
  if (lat && lng) {
    pipeline.push({
      $geoNear: {
        near: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
        distanceField: "dist.calculated",
        maxDistance: radius * 1000, 
        query: baseMatch,
        spherical: true
      }
    });
  } else {
    pipeline.push({ $match: baseMatch });
  }

  // 2. Group by User
  const rankingPipeline = [
    ...pipeline,
    { $group: { _id: "$userId", reportCount: { $sum: 1 } } },
    { $sort: { reportCount: -1, _id: 1 } } // Stable sorting
  ];

  // 3. Execution for Top 10
  const top10Pipeline = [
    ...rankingPipeline,
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
  ];

  const leaderboard = await Incident.aggregate(top10Pipeline);

  // 4. Calculate Individual Rank if userId provided
  let userRank = null;
  if (userId) {
    const allRankings = await Incident.aggregate(rankingPipeline);
    const index = allRankings.findIndex(r => r._id.toString() === userId.toString());
    
    if (index !== -1) {
      const userRankData = allRankings[index];
      // Get user details for this specific user
      const userDetails = await User.findById(userId).select("name profilePicture createdAt");
      userRank = {
        rank: index + 1,
        reportCount: userRankData.reportCount,
        name: userDetails.name,
        profilePicture: userDetails.profilePicture,
        memberSince: userDetails.createdAt,
        _id: userId
      };
    }
  }

  res.json({ leaderboard, userRank });
}));

export default router;
