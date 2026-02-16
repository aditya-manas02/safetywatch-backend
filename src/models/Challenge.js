import mongoose from "mongoose";

const challengeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  type: { 
    type: String, 
    enum: ["report_count", "vote_count", "area_safety_score"], 
    required: true 
  },
  targetValue: { type: Number, required: true }, // e.g., 5 reports
  areaCode: { type: String, uppercase: true, trim: true }, // null means global
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
  icon: { type: String, default: "Shield" }, // Lucide icon name
  points: { type: Number, default: 0 } // Potential reward points
}, { timestamps: true });

export default mongoose.model("Challenge", challengeSchema);
