import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  name: { type: String, required: true },
  phone: { type: String },
  passwordHash: { type: String, required: true },
  profilePicture: { type: String },
  createdAt: { type: Date, default: Date.now },
  isVerified: { type: Boolean, default: false },
  otp: { type: String },
  otpExpiresAt: { type: Date },
  passwordResetOtp: { type: String },
  passwordResetOtpExpiresAt: { type: Date },
  roles: { 
    type: [String], 
    enum: ["user", "admin", "superadmin"], 
    default: ["user"] 
  },
  // Rate limiting fields
  otpCount: { type: Number, default: 0 },
  otpWindowStart: { type: Date, default: Date.now },
  passwordResetCount: { type: Number, default: 0 },
  passwordResetWindowStart: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model("User", userSchema);
