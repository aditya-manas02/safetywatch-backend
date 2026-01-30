import express from "express";
import multer from "multer";
import cloudinary from "../config/cloudinary.js";
import { authMiddleware } from "../middleware/auth.js";
import { catchAsync } from "../utils/catchAsync.js";

const router = express.Router();

/* ---------------- MULTER (MEMORY STORAGE) ---------------- */
const storage = multer.memoryStorage();
const upload = multer({ storage });

/* ---------------- UPLOAD ROUTE ---------------- */
// MUST MATCH FRONTEND KEY: "image"
router.post("/", authMiddleware, upload.single("image"), catchAsync(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  // Upload buffer directly to Cloudinary
  const folder = req.query.folder || "incidents";
  const uploaded = await new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    ).end(req.file.buffer);
  });

  return res.json({ url: uploaded.secure_url });
}));

export default router;
