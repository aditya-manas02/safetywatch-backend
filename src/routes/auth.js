import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import dotenv from "dotenv";
import { z } from "zod";
import { sendPasswordResetEmail, sendOTPEmail } from "../services/emailService.js";

dotenv.config();
const router = express.Router();

/* -------------------------------------------------
   VALIDATION SCHEMAS
-------------------------------------------------- */
const signupSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const verifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6, "OTP must be 6 digits"),
});

const resendOtpSchema = z.object({
  email: z.string().email(),
});

/* -------------------------------------------------
   BROWSER-SAFE GET ROUTES (DEBUG / TEST ONLY)
-------------------------------------------------- */
router.get("/test", (req, res) => {
  res.json({ message: "Auth route is working" });
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

function generateTempPassword() {
  return Math.random().toString(36).slice(-8).toUpperCase();
}

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/* -------------------------------------------------
   SIGNUP
-------------------------------------------------- */
router.post("/signup", async (req, res) => {
  try {
    const { email, password, name, phone } = signupSchema.parse(req.body);

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

    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    const user = await User.create({
      email,
      name,
      phone,
      passwordHash,
      roles,
      otp,
      otpExpiresAt,
      isVerified: false,
    });

    const sent = await sendOTPEmail(email, otp);
    
    res.json({
      message: sent 
        ? "Registration successful! Please verify your email with the OTP sent."
        : "Registration successful, but we failed to send the verification email. Please try 'Resend Code' on the verification page.",
      user: {
        id: user._id,
        email: user.email,
        isVerified: user.isVerified,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.errors[0].message });
    }
    console.error("Signup Error:", err);
    res.status(500).json({
      message: "Server error during signup",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

/* -------------------------------------------------
   LOGIN
-------------------------------------------------- */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        message: "Please verify your email address before logging in.",
        needsVerification: true,
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
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.errors[0].message });
    }
    console.error("Login Error:", err);
    res.status(500).json({
      message: "Server error during login",
    });
  }
});

/* -------------------------------------------------
   VERIFY OTP
-------------------------------------------------- */
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = verifyOtpSchema.parse(req.body);

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "Email is already verified" });
    }

    if (!user.otp || user.otp !== otp || user.otpExpiresAt < new Date()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiresAt = undefined;
    await user.save();

    const token = signToken(user);

    res.json({
      message: "Email verified successfully!",
      token,
      user: {
        id: user._id,
        email: user.email,
        roles: user.roles,
        isVerified: true,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.errors[0].message });
    }
    console.error("OTP Verification Error:", err);
    res.status(500).json({ message: "Server error during verification" });
  }
});

/* -------------------------------------------------
   RESEND OTP
-------------------------------------------------- */
router.post("/resend-otp", async (req, res) => {
  try {
    const { email } = resendOtpSchema.parse(req.body);

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "Email already verified" });
    }

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    const sent = await sendOTPEmail(email, otp);
    if (!sent) {
      return res.status(500).json({ 
        message: "Failed to send OTP email. Please check server logs for SMTP errors.",
        error: "SMTP_FAILURE"
      });
    }

    res.json({ message: "A new OTP has been sent to your email." });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.errors[0].message });
    }
    console.error("Resend OTP Error:", err);
    res.status(500).json({ message: "Server error during resending OTP" });
  }
});

/* -------------------------------------------------
   FORGOT PASSWORD
-------------------------------------------------- */
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);

    const user = await User.findOne({ email });
    if (!user) {
      // Industry best practice: don't reveal if user exists
      return res.json({ message: "If an account exists, a reset email has been sent." });
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    await User.updateOne({ _id: user._id }, { passwordHash });

    console.log("------------------------------------------");
    console.log(`PASSWORD RESET REQUEST for: ${email}`);
    console.log(`GENERATED TEMP PASSWORD: ${tempPassword}`);
    console.log("------------------------------------------");

    const sent = await sendPasswordResetEmail(email, tempPassword);

    if (!sent) {
      console.error("Failed to send reset email to:", email);
    }

    res.json({ 
      message: "If an account exists, a reset email has been sent."
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.errors[0].message });
    }
    console.error("Forgot Password Error:", err);
    res.status(500).json({ 
      message: "Server error during password reset",
      details: err.message
    });
  }
});

export default router;
