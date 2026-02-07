import mongoose from "mongoose";

const incidentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  type: { type: String, enum: ["theft", "vandalism", "suspicious", "assault", "fire", "medical", "hazard", "traffic", "infrastructure", "nuisance", "missing", "harassment", "other"], required: true },
  location: { type: String, required: true },
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  status: { type: String, enum: ["pending", "under process", "approved", "rejected", "problem solved"], default: "pending" },
  isImportant: { type: Boolean, default: false },
  imageUrl: { type: String, default: null },
  allowMessages: { type: Boolean, default: true },
  areaCode: { type: String, uppercase: true, trim: true, required: true }, // Area code for location-based filtering
  acknowledgements: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  locationPoint: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point"
    },
    coordinates: {
      type: [Number],
      default: [0, 0] // [longitude, latitude]
    }
  }
}, { timestamps: true });

incidentSchema.index({ locationPoint: "2dsphere" });




export default mongoose.model("Incident", incidentSchema);

