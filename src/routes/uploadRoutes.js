import express from "express";
import multer from "multer";
import cloudinary from "../config/cloudinary.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// Temp storage
const upload = multer({ dest: "uploads/" });

// MUST MATCH FRONTEND KEY: "image"
router.post("/", authMiddleware, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const uploaded = await cloudinary.uploader.upload(req.file.path, {
      folder: "incidents",
    });

    return res.json({ url: uploaded.secure_url });

  } catch (err) {
    console.error("Image Upload Error:", err);
    return res.status(500).json({ error: "Upload failed" });
  }
});

export default router;
