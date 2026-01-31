import express from "express";
import User from "../models/User.js";
import Incident from "../models/Incident.js";
import { authMiddleware } from "../middleware/auth.js";
import { catchAsync } from "../utils/catchAsync.js";

const router = express.Router();

// XP Rewards
const XP_REWARDS = {
  REPORT_INCIDENT: 10,
  INCIDENT_APPROVED: 20,
  DAILY_LOGIN: 5,
};

// Level Thresholds
const LEVEL_THRESHOLDS = [
  0, 50, 150, 300, 500, 800, 1200, 1700, 2300, 3000
];

// Badge Definitions
const BADGES = {
  FIRST_REPORT: { id: "first_report", name: "First Report", icon: "🎯" },
  REPORTER_5: { id: "reporter_5", name: "Reporter", icon: "📝" },
  REPORTER_25: { id: "reporter_25", name: "Active Reporter", icon: "📋" },
  REPORTER_100: { id: "reporter_100", name: "Super Reporter", icon: "🏆" },
  WEEK_STREAK: { id: "week_streak", name: "Week Warrior", icon: "🔥" },
  VERIFIED: { id: "verified", name: "Verified", icon: "✓" },
};

function calculateLevel(xp) {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      return i + 1;
    }
  }
  return 1;
}

/* ============================================================
   GET USER PROFILE WITH GAMIFICATION DATA
   GET /api/gamification/profile
   ============================================================ */
router.get("/profile", authMiddleware, catchAsync(async (req, res) => {
  const user = await User.findById(req.user.userId).select("name email xp level badges");
  
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const reportCount = await Incident.countDocuments({ 
    userId: req.user.userId 
  });

  const approvedCount = await Incident.countDocuments({
    userId: req.user.userId,
    status: "approved"
  });

  const currentLevel = user.level;
  const nextLevelXp = LEVEL_THRESHOLDS[currentLevel] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const currentLevelXp = LEVEL_THRESHOLDS[currentLevel - 1] || 0;
  const progressToNext = ((user.xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;

  res.json({
    user: {
      name: user.name,
      email: user.email,
      xp: user.xp,
      level: user.level,
      badges: user.badges,
    },
    stats: {
      reportCount,
      approvedCount,
      nextLevelXp,
      progressToNext: Math.min(100, Math.max(0, progressToNext)),
    }
  });
}));

/* ============================================================
   GET LEADERBOARD
   GET /api/gamification/leaderboard
   ============================================================ */
router.get("/leaderboard", catchAsync(async (req, res) => {
  const topUsers = await User.find()
    .select("name xp level badges")
    .sort({ xp: -1 })
    .limit(10);

  const leaderboard = topUsers.map((user, index) => ({
    rank: index + 1,
    name: user.name,
    xp: user.xp,
    level: user.level,
    badges: user.badges,
  }));

  res.json({ leaderboard });
}));

/* ============================================================
   AWARD XP (INTERNAL USE)
   POST /api/gamification/award-xp
   ============================================================ */
router.post("/award-xp", authMiddleware, catchAsync(async (req, res) => {
  const { userId, xpAmount, reason } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  user.xp += xpAmount;
  user.level = calculateLevel(user.xp);

  // Check for new badges
  const reportCount = await Incident.countDocuments({ userId });
  
  if (reportCount === 1 && !user.badges.includes(BADGES.FIRST_REPORT.id)) {
    user.badges.push(BADGES.FIRST_REPORT.id);
  }
  if (reportCount >= 5 && !user.badges.includes(BADGES.REPORTER_5.id)) {
    user.badges.push(BADGES.REPORTER_5.id);
  }
  if (reportCount >= 25 && !user.badges.includes(BADGES.REPORTER_25.id)) {
    user.badges.push(BADGES.REPORTER_25.id);
  }
  if (reportCount >= 100 && !user.badges.includes(BADGES.REPORTER_100.id)) {
    user.badges.push(BADGES.REPORTER_100.id);
  }

  await user.save();

  res.json({
    message: "XP awarded",
    xp: user.xp,
    level: user.level,
    badges: user.badges,
    reason,
  });
}));

/* ============================================================
   GET ALL BADGES
   GET /api/gamification/badges
   ============================================================ */
router.get("/badges", catchAsync(async (req, res) => {
  res.json({ badges: Object.values(BADGES) });
}));

export default router;
export { XP_REWARDS, BADGES, calculateLevel };
