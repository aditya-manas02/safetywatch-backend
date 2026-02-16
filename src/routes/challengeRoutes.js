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
    
    const challenge = new Challenge({
      title,
      description,
      type,
      targetValue,
      areaCode: areaCode || req.user.areaCode,
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

export default router;
