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
  // Gamification
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  badges: { type: [String], default: [] }
}, { timestamps: true });

export default mongoose.model("User", userSchema);
