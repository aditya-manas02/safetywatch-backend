// backend/src/routes/auth.js
import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

/* -------------------------------------------------
   BROWSER-SAFE GET ROUTES (DEBUG / TEST ONLY)
-------------------------------------------------- */

// Open in browser: /api/auth
router.get("/", (req, res) => {
  res.json({
    status: "Auth API is working",
    endpoints: {
      signup: "POST /api/auth/signup",
      login: "POST /api/auth/login",
    },
  });
});

// Open in browser: /api/auth/login
router.get("/login", (req, res) => {
  res.json({ message: "Use POST /api/auth/login" });
});

// Open in browser: /api/auth/signup
router.get("/signup", (req, res) => {
  res.json({ message: "Use POST /api/auth/signup" });
});

/* -------------------------------------------------
   HELPERS
-------------------------------------------------- */

function signToken(user) {
  return jwt.sign(
    {
      id: user._id,
      roles: user.roles,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    }
  );
}

/* -------------------------------------------------
   SIGNUP
-------------------------------------------------- */
router.post("/signup", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: "Email and password required",
    });
  }

  try {
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({
        message: "Email already exists",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const roles = ["user"];

    if (
      process.env.SUPERADMIN_EMAIL &&
      email.toLowerCase() === process.env.SUPERADMIN_EMAIL.toLowerCase()
    ) {
      roles.push("admin", "superadmin");
    }

    const user = await User.create({
      email,
      passwordHash,
      roles,
    });

    const token = signToken(user);

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        roles: user.roles,
      },
    });
  } catch (err) {
    res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
});

/* -------------------------------------------------
   LOGIN
-------------------------------------------------- */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: "Email and password required",
    });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    const token = signToken(user);

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        roles: user.roles,
      },
    });
  } catch (err) {
    res.status(500).json({
      message: "Server error",
    });
  }
});

export default router;
