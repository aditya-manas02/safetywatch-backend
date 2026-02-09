import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import dotenv from "dotenv";
import { z } from "zod";
import { sendPasswordResetEmail, sendOTPEmail, validateEmailDomain } from "../services/emailService.js";
import { catchAsync } from "../utils/catchAsync.js";



dotenv.config();
const router = express.Router();

/* -------------------------------------------------
   VALIDATION SCHEMAS
-------------------------------------------------- */
const signupSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2, "Name must be at least 2 characters"),
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

router.get("/test-smtp", async (req, res) => {
    // Check if credentials exist
    const configCheck = {
      hasBrevoKey: !!process.env.BREVO_API_KEY,
      brevoLen: process.env.BREVO_API_KEY ? process.env.BREVO_API_KEY.length : 0,
      brevoPrefix: process.env.BREVO_API_KEY ? process.env.BREVO_API_KEY.substring(0, 10) : "none",
      emailFrom: process.env.EMAIL_FROM || "not-set",
      hasResendKey: !!process.env.RESEND_API_KEY,
      hasSmtpUser: !!process.env.SMTP_USER,
      hasSmtpPass: !!process.env.SMTP_PASS,
      nodeEnv: process.env.NODE_ENV,
      renderInstance: process.env.RENDER_INSTANCE_TYPE || "unknown"
    };

    if (process.env.BREVO_API_KEY) {
      try {
        const brevoResponse = await fetch("https://api.brevo.com/v3/account", {
          headers: { "api-key": process.env.BREVO_API_KEY.trim() }
        });
        const brevoData = await brevoResponse.json();
        
        if (brevoResponse.ok) {
          // If a test email is provided in query, try sending it
          let testResult = null;
          if (req.query.email) {
            const { sendOTPEmail } = await import("../services/emailService.js");
            testResult = await sendOTPEmail(req.query.email, "123456");
          }

          return res.json({ 
            status: "success", 
            message: "Brevo API Key is VALID. If you don't see the email, check the Deliverability link below.",
            account: brevoData.email,
            testEmailSent: testResult,
            deliverabilityLink: "https://app.brevo.com/transactional/statistics",
            senderVerificationLink: "https://app.brevo.com/senders/management/sender",
            config: configCheck
          });
        } else {
          return res.status(brevoResponse.status).json({ 
            status: "error", 
            message: "Brevo API Key REJECTED by Brevo",
            brevoError: brevoData,
            config: configCheck
          });
        }
      } catch (err) {
        return res.status(500).json({ 
          status: "error", 
          message: "Could not connect to Brevo API",
          error: err.message,
          config: configCheck
        });
      }
    }

    if (process.env.RESEND_API_KEY) {
      return res.json({ 
        status: "success", 
        message: "Resend API is configured and ready (Sandbox restrictions may apply)",
        config: configCheck
      });
    }

    if (!configCheck.hasSmtpUser || !configCheck.hasSmtpPass) {
      return res.status(400).json({ 
        error: "No email provider configured (Missing BREVO_API_KEY, RESEND_API_KEY or SMTP_USER/PASS)!",
        config: configCheck
      });
    }

  // Extreme timeout for the test route to match the transporter
  const timeoutId = setTimeout(() => {
    if (!res.headersSent) {
      res.status(504).json({ 
        error: "SMTP Connection timed out after 50s. This strongly indicates Render is blocking Port 465/587.",
        config: configCheck,
        solution: "Try using a service like Resend.com or SendGrid if Gmail continues to be blocked."
      });
    }
  }, 50000);

  try {
    const { transporter } = await import("../services/emailService.js");
    await transporter.verify();
    clearTimeout(timeoutId);
    
    res.json({ 
      status: "success", 
      message: "SMTP server is ready",
      config: configCheck
    });
  } catch (error) {
    clearTimeout(timeoutId);
    res.status(500).json({ 
      status: "error", 
      message: "SMTP connection failed", 
      error: error.message,
      code: error.code,
      config: configCheck
    });
  }
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

/**
 * Rate limiting helper
 * @param {Object} user User model instance
 * @param {String} type 'otp' or 'passwordReset'
 * @param {Number} limit Max allowed in window
 * @param {Number} windowHours Window duration in hours
 */
async function checkRateLimit(user, type, limit, windowHours) {
  const countField = `${type}Count`;
  const windowStartField = `${type}WindowStart`;
  const now = new Date();
  const windowStart = user[windowStartField] || now;
  const windowMillis = windowHours * 60 * 60 * 1000;

  // Check if window has expired
  if (now - windowStart > windowMillis) {
    user[countField] = 0;
    user[windowStartField] = now;
  }

  const resetAt = new Date(user[windowStartField].getTime() + windowMillis);
  const resetIn = Math.max(0, resetAt - now);
  
  const formatTime = (ms) => {
    const totalMinutes = Math.ceil(ms / (60 * 1000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (user[countField] >= limit) {
    return { 
      limited: true, 
      message: `Limit reached. Please try again in ${formatTime(resetIn)}.`,
      rateLimit: {
        remaining: 0,
        resetIn: formatTime(resetIn),
        total: limit
      }
    };
  }

  user[countField] += 1;
  await user.save();
  
  return { 
    limited: false,
    rateLimit: {
      remaining: limit - user[countField],
      resetIn: formatTime(resetIn),
      total: limit
    }
  };
}

/* -------------------------------------------------
   SIGNUP
-------------------------------------------------- */
router.post("/signup", catchAsync(async (req, res) => {
  const { email, password, name } = signupSchema.parse(req.body);

  // 1. Validate email domain existence
  const emailVal = await validateEmailDomain(email);
  if (!emailVal.valid) {
    return res.status(400).json({ message: emailVal.message });
  }

  let user = await User.findOne({ email });
  
  if (user && user.isVerified) {
    return res.status(400).json({
      message: "Email already exists",
    });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const otp = generateOTP();
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); 
  
  const roles = ["user"];
  if (process.env.SUPERADMIN_EMAIL && email.toLowerCase() === process.env.SUPERADMIN_EMAIL.toLowerCase()) {
    roles.push("admin", "superadmin");
  }

  if (user) {
    // Check OTP rate limit for existing unverified user
    const rateLimit = await checkRateLimit(user, 'otp', 10, 1);
    if (rateLimit.limited) {
      return res.status(429).json({ message: rateLimit.message, rateLimit: rateLimit.rateLimit });
    }

    user.name = name;
    user.passwordHash = passwordHash;
    user.otp = otp;
    user.otpExpiresAt = otpExpiresAt;
    user.roles = roles; 
    await user.save();
    
    // Pass rateLimit info forward
    req.rateLimitInfo = rateLimit.rateLimit;
  } else {
    user = await User.create({
      email,
      name,
      passwordHash,
      roles,
      otp,
      otpExpiresAt,
      isVerified: false,
      otpCount: 1,
      otpWindowStart: new Date()
    });
    req.rateLimitInfo = { remaining: 2, resetIn: "60m", total: 3 };
  }

  // ... (rest of signup logic handled below with req.rateLimitInfo)


  // CRITICAL FIX: Await email sending and handle errors properly
  console.log(`[SIGNUP] Attempting to send OTP to: ${email}`);
  const { success, error: emailError } = await sendOTPEmail(email, otp);
  
  if (!success) {
    console.error(`[SIGNUP] Email failed for ${email}:`, emailError);
    
    // Cleanup: If this was a new user, remove them so they can try again with a corrected email
    // If it was an existing unverified user, we keep them but still report the failure
    const isNewUser = user.createdAt && (new Date() - user.createdAt < 5000); // Created in last 5s
    if (isNewUser && !user.isVerified) {
      await User.deleteOne({ _id: user._id });
    }

    return res.status(400).json({
      message: "Verification email could not be delivered. Please check if your email address is correct.",
      details: emailError?.message
    });
  }

  console.log(`[SIGNUP] ✅ OTP sent successfully to: ${email}`);
  res.status(201).json({
    message: "Registration successful! Verification code sent to your email.",
    rateLimit: req.rateLimitInfo,
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
      roles: user.roles,
      createdAt: user.createdAt,
      isVerified: user.isVerified,
      profilePicture: user.profilePicture,
    },
  });
}));

/* -------------------------------------------------
   LOGIN
-------------------------------------------------- */
router.post("/login", catchAsync(async (req, res) => {
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
      name: user.name,
      roles: user.roles,
      createdAt: user.createdAt,
      isVerified: user.isVerified,
      profilePicture: user.profilePicture,
      areaCode: user.areaCode,
      assignedAreaCodes: user.assignedAreaCodes || [],
      hasAreaCode: !!user.areaCode && user.areaCode !== "DEFAULT", // Flag to check if user needs to enter area code
    },

  });
}));

/* -------------------------------------------------
   VERIFY OTP
-------------------------------------------------- */
router.post("/verify-otp", catchAsync(async (req, res) => {
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
    token: token,
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
      roles: user.roles,
      createdAt: user.createdAt,
      isVerified: true,
      profilePicture: user.profilePicture,
      areaCode: user.areaCode,
      assignedAreaCodes: user.assignedAreaCodes || [],
      hasAreaCode: !!user.areaCode && user.areaCode !== "DEFAULT",
    },

  });
}));




/* -------------------------------------------------
   RESEND OTP
-------------------------------------------------- */
router.post("/resend-otp", catchAsync(async (req, res) => {
  const { email } = resendOtpSchema.parse(req.body);

  const emailVal = await validateEmailDomain(email);
  if (!emailVal.valid) {
    return res.status(400).json({ message: emailVal.message });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (user.isVerified) {
    return res.status(400).json({ message: "Email already verified" });
  }

  // Check OTP rate limit
  const rateLimitInfo = await checkRateLimit(user, 'otp', 10, 1);
  if (rateLimitInfo.limited) {
    return res.status(429).json({ message: rateLimitInfo.message, rateLimit: rateLimitInfo.rateLimit });
  }

  const otp = generateOTP();
  user.otp = otp;
  user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();

  const { success, error: emailError } = await sendOTPEmail(email, otp);
  if (!success) {
    return res.status(500).json({ 
      message: `Failed to send OTP email: ${emailError?.message || "Unknown error"}`,
      code: emailError?.code,
      command: emailError?.command,
      rateLimit: rateLimitInfo.rateLimit
    });
  }

  res.json({ 
    message: "A new OTP has been sent to your email.",
    rateLimit: rateLimitInfo.rateLimit
  });
}));

/* -------------------------------------------------
   FORGOT PASSWORD
-------------------------------------------------- */
router.post("/forgot-password", catchAsync(async (req, res) => {
  const { email } = forgotPasswordSchema.parse(req.body);

  const emailVal = await validateEmailDomain(email);
  if (!emailVal.valid) {
    return res.status(400).json({ message: emailVal.message });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.json({ message: "If an account exists, a reset email has been sent." });
  }

  // Check Password Reset rate limit
  const rateLimitInfo = await checkRateLimit(user, 'passwordReset', 10, 24);
  if (rateLimitInfo.limited) {
    return res.status(429).json({ message: rateLimitInfo.message, rateLimit: rateLimitInfo.rateLimit });
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  await User.updateOne({ _id: user._id }, { 
    passwordHash,
    passwordResetCount: user.passwordResetCount, // Already incremented in checkRateLimit
    passwordResetWindowStart: user.passwordResetWindowStart
  });

  console.log("------------------------------------------");
  console.log(`PASSWORD RESET REQUEST for: ${email}`);
  console.log(`GENERATED TEMP PASSWORD: ${tempPassword}`);
  console.log("------------------------------------------");

  const sent = await sendPasswordResetEmail(email, tempPassword);

  if (!sent) {
    console.error("Failed to send reset email to:", email);
  }

  res.json({ 
    message: "If an account exists, a reset email has been sent.",
    rateLimit: rateLimitInfo.rateLimit
  });
}));

/* -------------------------------------------------
   PASSWORD MANAGEMENT (PROFILE)
-------------------------------------------------- */

// Change password (requires current password)
router.post("/change-password", async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;

    // Validate input
    if (!email || !currentPassword || !newPassword) {
      return res.status(400).json({ message: "Email, current password, and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters long" });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    user.passwordHash = newPasswordHash;
    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("Change Password Error:", err);
    res.status(500).json({ message: "Server error during password change" });
  }
});

// Request password reset OTP (for users who forgot password)
router.post("/request-password-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists for security
      return res.json({ message: "If an account exists, an OTP has been sent to your email" });
    }

    // Check OTP rate limit
    const rateLimitInfo = await checkRateLimit(user, 'otp', 10, 1);
    if (rateLimitInfo.limited) {
      return res.status(429).json({ message: rateLimitInfo.message, rateLimit: rateLimitInfo.rateLimit });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    // Save OTP to user
    user.passwordResetOtp = otp;
    user.passwordResetOtpExpiresAt = otpExpiresAt;
    await user.save();

    // Send OTP email
    const { success } = await sendOTPEmail(email, otp);
    
    if (!success) {
      return res.status(500).json({ 
        message: "Failed to send OTP email. Please try again.",
        rateLimit: rateLimitInfo.rateLimit
      });
    }

    res.json({ 
      message: "OTP sent to your email. Please check your inbox.",
      rateLimit: rateLimitInfo.rateLimit
    });
  } catch (err) {
    console.error("Request Password OTP Error:", err);
    res.status(500).json({ message: "Server error during OTP request" });
  }
});

// Reset password with OTP verification
router.post("/reset-password-otp", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "Email, OTP, and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters long" });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if OTP exists
    if (!user.passwordResetOtp || !user.passwordResetOtpExpiresAt) {
      return res.status(400).json({ message: "No OTP request found. Please request a new OTP." });
    }

    // Check if OTP is expired
    if (new Date() > user.passwordResetOtpExpiresAt) {
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }

    // Verify OTP
    if (user.passwordResetOtp !== otp) {
      return res.status(401).json({ message: "Invalid OTP. Please check and try again." });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    user.passwordHash = newPasswordHash;
    
    // Clear OTP fields
    user.passwordResetOtp = undefined;
    user.passwordResetOtpExpiresAt = undefined;
    await user.save();

    res.json({ message: "Password reset successfully. You can now log in with your new password." });
  } catch (err) {
    console.error("Reset Password OTP Error:", err);
    res.status(500).json({ message: "Server error during password reset" });
  }
});

/* -------------------------------------------------
   AREA CODE MANAGEMENT
-------------------------------------------------- */

// Assign area code to user (after login)
router.post("/assign-area-code", async (req, res) => {
  try {
    const { email, areaCode } = req.body;

    if (!email || !areaCode) {
      return res.status(400).json({ message: "Email and area code are required" });
    }

    // Import AreaCode model
    const AreaCode = (await import("../models/AreaCode.js")).default;

    // Verify area code exists and is active
    const validAreaCode = await AreaCode.findOne({ 
      code: areaCode.toUpperCase(), 
      isActive: true 
    });

    if (!validAreaCode) {
      return res.status(404).json({ message: "Invalid or inactive area code" });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user is admin and verify they have access to this area code
    if (user.roles.includes("admin") && !user.roles.includes("superadmin")) {
      if (!user.assignedAreaCodes || !user.assignedAreaCodes.includes(areaCode.toUpperCase())) {
        return res.status(403).json({ 
          message: "You do not have access to this area code. Please contact your administrator." 
        });
      }
    }

    // Assign area code to user
    user.areaCode = areaCode.toUpperCase();
    await user.save();

    // Update area code statistics
    validAreaCode.totalUsers = await User.countDocuments({ areaCode: areaCode.toUpperCase() });
    await validAreaCode.save();

    res.json({
      message: "Area code assigned successfully",
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        areaCode: user.areaCode,
        roles: user.roles
      },
      areaInfo: {
        code: validAreaCode.code,
        name: validAreaCode.name,
        description: validAreaCode.description
      }
    });
  } catch (err) {
    console.error("Assign Area Code Error:", err);
    res.status(500).json({ message: "Server error during area code assignment" });
  }
});

// Verify area code (check if valid and active)
router.post("/verify-area-code", async (req, res) => {
  try {
    const { areaCode } = req.body;

    if (!areaCode) {
      return res.status(400).json({ message: "Area code is required" });
    }

    // Import AreaCode model
    const AreaCode = (await import("../models/AreaCode.js")).default;

    const validAreaCode = await AreaCode.findOne({ 
      code: areaCode.toUpperCase(), 
      isActive: true 
    });

    if (!validAreaCode) {
      return res.status(404).json({ 
        valid: false,
        message: "Invalid or inactive area code" 
      });
    }

    res.json({
      valid: true,
      areaCode: {
        code: validAreaCode.code,
        name: validAreaCode.name,
        description: validAreaCode.description
      }
    });
  } catch (err) {
    console.error("Verify Area Code Error:", err);
    res.status(500).json({ message: "Server error during area code verification" });
  }
});

export default router;

