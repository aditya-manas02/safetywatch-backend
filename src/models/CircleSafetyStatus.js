import mongoose from "mongoose";

const circleSafetyStatusSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  circle: { type: mongoose.Schema.Types.ObjectId, ref: "Circle", required: true },
  status: { 
    type: String, 
    enum: ["Safe", "Need Help", "In Danger", "Unknown"], 
    default: "Unknown" 
  },
  note: { type: String },
  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point"
    },
    coordinates: {
      type: [Number],
      default: [0, 0] // [longitude, latitude]
    }
  },
  lastCheckIn: { type: Date, default: Date.now }
}, { timestamps: true });

// Index for geo queries if needed
circleSafetyStatusSchema.index({ location: "2dsphere" });
// Ensure one status per user per circle
circleSafetyStatusSchema.index({ user: 1, circle: 1 }, { unique: true });

export default mongoose.model("CircleSafetyStatus", circleSafetyStatusSchema);
