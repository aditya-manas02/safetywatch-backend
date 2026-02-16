import express from "express";
import Ad from "../models/Ad.js";
import { authMiddleware, requireSuperAdmin } from "../middleware/auth.js";
import cloudinary from "cloudinary";

const router = express.Router();

// Create Ad (Super Admin only)
router.post("/", authMiddleware, requireSuperAdmin, async (req, res) => {
  try {
    const { title, imageUrl, link, areaCode, expiresAt } = req.body;
    
    const ad = new Ad({
      title,
      imageUrl,
      link,
      areaCode: areaCode || null,
      expiresAt: expiresAt ? new Date(expiresAt) : null
    });

    await ad.save();
    res.status(201).json(ad);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// List all ads (Admin/Super Admin)
router.get("/", authMiddleware, requireSuperAdmin, async (req, res) => {
  try {
    const ads = await Ad.find().sort({ createdAt: -1 });
    res.json(ads);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get active ads for a specific area (Public/User)
router.get("/active", async (req, res) => {
  try {
    const { areaCode } = req.query;
    const now = new Date();

    const query = {
      isActive: true,
      $or: [
        { expiresAt: { $gt: now } },
        { expiresAt: null }
      ],
      $or: [
        { areaCode: areaCode },
        { areaCode: null },
        { areaCode: "" }
      ]
    };

    // Need to combine the $ors correctly
    const finalQuery = {
      isActive: true,
      $and: [
        { $or: [{ expiresAt: { $gt: now } }, { expiresAt: null }] },
        { $or: [{ areaCode: areaCode }, { areaCode: null }, { areaCode: "" }] }
      ]
    };

    const ads = await Ad.find(finalQuery).sort({ createdAt: -1 });
    res.json(ads);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete Ad (Super Admin)
router.delete("/:id", authMiddleware, requireSuperAdmin, async (req, res) => {
  try {
    const ad = await Ad.findById(req.params.id);
    if (!ad) return res.status(404).json({ message: "Advertisement not found" });

    // Optional: Delete image from Cloudinary if needed
    // if (ad.imageUrl.includes("cloudinary")) { ... }

    await Ad.findByIdAndDelete(req.params.id);
    res.json({ message: "Advertisement removed successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Increment click count
router.post("/:id/click", async (req, res) => {
  try {
    await Ad.findByIdAndUpdate(req.params.id, { $inc: { clicks: 1 } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
