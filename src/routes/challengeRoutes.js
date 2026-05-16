// Community Challenges API - v1.4.7-DEPLOY-FIX
import express from "express";
import Challenge from "../models/Challenge.js";
import ChallengeParticipation from "../models/ChallengeParticipation.js";
import { authMiddleware, requireAdminOnly } from "../middleware/auth.js";

const router = express.Router();

// Get active challenges for a user's area
router.get("/active", authMiddleware, async (req, res) => {
  try {
    const userAreaCode = req.user.areaCode;
    const now = new Date();

    const challenges = await Challenge.find({
      isActive: true,
      endDate: { $gt: now },
      $or: [
        { areaCode: userAreaCode },
        { areaCode: null },
        { areaCode: "" }
      ]
    });

    // Fetch user progress for these challenges
    const participations = await ChallengeParticipation.find({
      userId: req.user.id,
      challengeId: { $in: challenges.map(c => c._id) }
    });

    const challengesWithProgress = challenges.map(challenge => {
      const participation = participations.find(p => p.challengeId.equals(challenge._id));
      return {
        ...challenge.toObject(),
        progress: participation ? participation.currentValue : 0,
        isCompleted: participation ? participation.isCompleted : false
      };
    });

    res.json(challengesWithProgress);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: Create a new challenge
router.post("/", authMiddleware, requireAdminOnly, async (req, res) => {
  try {
    const { title, description, type, targetValue, areaCode, endDate, icon, points } = req.body;
    
    // Permission Enforcement:
    // 1. Normal Admins can ONLY create challenges for their own area.
    // 2. Super Admins can create global (null areaCode) or area-specific challenges.
    let finalAreaCode = areaCode;
    if (!req.user.isSuperAdmin) {
      finalAreaCode = req.user.areaCode;
    }

    const challenge = new Challenge({
      title,
      description,
      type,
      targetValue,
      areaCode: finalAreaCode,
      endDate,
      icon,
      points
    });

    await challenge.save();
    res.status(201).json(challenge);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Admin: Get all challenges (for management)
router.get("/", authMiddleware, requireAdminOnly, async (req, res) => {
  try {
    const query = {};
    if (!req.user.isSuperAdmin) {
      query.areaCode = req.user.areaCode;
    }

    const challenges = await Challenge.find(query).sort({ createdAt: -1 });
    res.json(challenges);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: Toggle challenge status
router.patch("/:id/toggle", authMiddleware, requireAdminOnly, async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) return res.status(404).json({ message: "Challenge not found" });

    challenge.isActive = !challenge.isActive;
    await challenge.save();
    res.json(challenge);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Admin: Delete a challenge
router.delete("/:id", authMiddleware, requireAdminOnly, async (req, res) => {
  try {
    const challenge = await Challenge.findByIdAndDelete(req.params.id);
    if (!challenge) return res.status(404).json({ message: "Challenge not found" });
    
    // Also cleanup participations
    await ChallengeParticipation.deleteMany({ challengeId: req.params.id });

    res.json({ message: "Challenge deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
