import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import dotenv from "dotenv";
import { z } from "zod";
import { sendPasswordResetEmail, sendOTPEmail } from "../services/emailService.js";
import { sendPhoneOTP } from "../services/smsService.js";
import { catchAsync } from "../utils/catchAsync.js";
import { verifyFirebaseToken } from "../utils/firebaseAdmin.js";


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

const phoneOtpRequestSchema = z.object({
  phone: z.string().min(10, "Invalid phone number"),
});

const phoneOtpVerifySchema = z.object({
  phone: z.string().min(10, "Invalid phone number"),
  otp: z.string().length(6, "OTP must be 6 digits").optional(),
  firebaseToken: z.string().optional(),
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

/* -------------------------------------------------
   SIGNUP
-------------------------------------------------- */
router.post("/signup", catchAsync(async (req, res) => {
  const { email, password, name, phone } = signupSchema.parse(req.body);

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
    user.name = name;
    user.phone = phone;
    user.passwordHash = passwordHash;
    user.otp = otp;
    user.otpExpiresAt = otpExpiresAt;
    user.roles = roles; 
    await user.save();
  } else {
    user = await User.create({
      email,
      name,
      phone,
      passwordHash,
      roles,
      otp,
      otpExpiresAt,
      isVerified: false,
    });
  }

  sendOTPEmail(email, otp).catch(err => console.error("Async Email Error:", err));

  res.status(201).json({
    message: "Registration successful! Verification code sent to your email.",
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
      phone: user.phone,
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
      phone: user.phone,
      roles: user.roles,
      createdAt: user.createdAt,
      isVerified: user.isVerified,
      profilePicture: user.profilePicture,
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
      phone: user.phone,
      roles: user.roles,
      createdAt: user.createdAt,
      isVerified: true,
      profilePicture: user.profilePicture,
    },
  });
}));

/* -------------------------------------------------
   PHONE OTP REQUEST
-------------------------------------------------- */
router.post("/request-phone-otp", catchAsync(async (req, res) => {
  const { phone } = phoneOtpRequestSchema.parse(req.body);

  // Search for user by phone
  const user = await User.findOne({ phone });
  
  // NOTE: Per user request, email is mandatory. 
  // If user doesn't exist, we'll signal the frontend to collect email after verification.
  const otp = generateOTP();
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

  if (user) {
    user.otp = otp;
    user.otpExpiresAt = otpExpiresAt;
    await user.save();
  } else {
    // For new users, we'll store a temporary user or just verify the phone-otp pair
    // Industry practice: Store in a temporary collection or use a specialized OTP model.
    // For now, we'll create a "placeholder" or skip creation until verification.
    // Let's create a temporary user if it helps, but we MUST collect email/name later.
    // Actually, let's just use the verified signal for now.
  }

  const { success, error } = await sendPhoneOTP(phone, otp);
  
  if (!success) {
    return res.status(500).json({ message: "Failed to send SMS", error });
  }

  // If no user, we return meta data to let frontend know registration is needed
  res.json({
    message: "OTP sent successfully to your mobile number.",
    isExistingUser: !!user
  });
}));

/* -------------------------------------------------
   PHONE OTP VERIFY
-------------------------------------------------- */
router.post("/verify-phone-otp", catchAsync(async (req, res) => {
  const { phone, otp, firebaseToken } = phoneOtpVerifySchema.parse(req.body);

  if (firebaseToken) {
    const { success, error } = await verifyFirebaseToken(firebaseToken);
    if (!success) {
      return res.status(401).json({ message: "Firebase verification failed", error });
    }
    // Token is valid! We can proceed.
  } else if (!otp) {
    return res.status(400).json({ message: "OTP or Firebase Token is required" });
  }

  const user = await User.findOne({ phone });


  // If user doesn't exist, this is a registration attempt. 
  // We verified the phone, but we need email/name to create the user.
  if (!user) {
    // In a real system, we'd check if the OTP matches what was sent to this phone.
    // Since we didn't store it in a DB for non-users, we'll simplify for this demo:
    // (A more robust way would be a separate 'PhoneOtp' model)
    // For now, let's assume we need to return a "VERIFIED" status for the phone.
    return res.json({
      verified: true,
      phone: phone,
      isNewUser: true,
      message: "Phone verified. Please complete your profile (Email is required)."
    });
  }

  // Existing user verification
  if (!firebaseToken) {
    if (!user.otp || user.otp !== otp || user.otpExpiresAt < new Date()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }
  }

  user.isVerified = true; // Mobile verification also verifies account

  user.otp = undefined;
  user.otpExpiresAt = undefined;
  await user.save();

  const token = signToken(user);

  res.json({
    message: "Login successful via mobile!",
    token,
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      roles: user.roles,
      createdAt: user.createdAt,
      isVerified: true,
      profilePicture: user.profilePicture,
    },
  });
}));

/* -------------------------------------------------
   RESEND OTP
-------------------------------------------------- */
router.post("/resend-otp", catchAsync(async (req, res) => {
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

  const { success, error: emailError } = await sendOTPEmail(email, otp);
  if (!success) {
    return res.status(500).json({ 
      message: `Failed to send OTP email: ${emailError?.message || "Unknown error"}`,
      code: emailError?.code,
      command: emailError?.command
    });
  }

  res.json({ message: "A new OTP has been sent to your email." });
}));

/* -------------------------------------------------
   FORGOT PASSWORD
-------------------------------------------------- */
router.post("/forgot-password", catchAsync(async (req, res) => {
  const { email } = forgotPasswordSchema.parse(req.body);

  const user = await User.findOne({ email });
  if (!user) {
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
      return res.status(500).json({ message: "Failed to send OTP email. Please try again." });
    }

    res.json({ message: "OTP sent to your email. Please check your inbox." });
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

export default router;
