// backend/src/routes/auth.js
import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();

/**
 * Helper: sign JWT with roles included
 */
function signToken(user) {
  return jwt.sign(
    { id: user._id, roles: user.roles },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

/**
 * SIGNUP
 * If the email matches SUPERADMIN_EMAIL in .env, give superadmin role.
 */
router.post("/signup", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Email and password required" });

  try {
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "Email exists" });

    const passwordHash = await bcrypt.hash(password, 10);

    // default roles array
    const roles = ["user"];

    // If .env defines SUPERADMIN_EMAIL and the signup email matches it, make superadmin
    if (process.env.SUPERADMIN_EMAIL && email.toLowerCase() === process.env.SUPERADMIN_EMAIL.toLowerCase()) {
      roles.push("superadmin", "admin");
    }

    const user = await User.create({ email, passwordHash, roles });
    const token = signToken(user);

    res.json({ token, user: { id: user._id, email: user.email, roles: user.roles } });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/**
 * LOGIN
 */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Email and password required" });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(400).json({ message: "Invalid credentials" });

    const token = signToken(user);
    res.json({ token, user: { id: user._id, email: user.email, roles: user.roles } });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
