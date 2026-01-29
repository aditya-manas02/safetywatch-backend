import express from "express";
import multer from "multer";
import cloudinary from "../config/cloudinary.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

/* ---------------- MULTER (MEMORY STORAGE) ---------------- */
const storage = multer.memoryStorage();
const upload = multer({ storage });

/* ---------------- UPLOAD ROUTE ---------------- */
// MUST MATCH FRONTEND KEY: "image"
router.post("/", authMiddleware, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Upload buffer directly to Cloudinary
    const uploaded = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: "incidents" },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(req.file.buffer);
    });

    return res.json({ url: uploaded.secure_url });

  } catch (err) {
    console.error("Image Upload Error:", err);
    return res.status(500).json({ message: "Upload failed", details: err.message });
  }
});

export default router;
