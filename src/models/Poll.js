import mongoose from "mongoose";

const pollSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [{
    text: { type: String, required: true },
    votes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
  }],
  areaCode: { type: String, uppercase: true, trim: true, required: true }, // Polls are area-specific
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  isActive: { type: Boolean, default: true },
  expiresAt: { type: Date }
}, { timestamps: true });

// Index for faster lookups by area and status
pollSchema.index({ areaCode: 1, isActive: 1 });

export default mongoose.model("Poll", pollSchema);
