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
  isSuspended: { type: Boolean, default: false },
  suspensionExpiresAt: { type: Date },
  warnings: [{
    reason: { type: String, required: true },
    date: { type: Date, default: Date.now },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  }],
  // Area code fields for location-based access
  areaCode: { type: String, uppercase: true, trim: true }, // User's assigned area code
  assignedAreaCodes: [{ type: String, uppercase: true }], // For admins managing multiple areas
  // Rate limiting fields
  otpCount: { type: Number, default: 0 },
  otpWindowStart: { type: Date, default: Date.now },
  passwordResetCount: { type: Number, default: 0 },
  passwordResetWindowStart: { type: Date, default: Date.now },
  // Reward system fields
  rewardPoints: { type: Number, default: 0 },
  badges: [{
    name: { type: String, required: true },
    purchasedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

export default mongoose.model("User", userSchema);
