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
  acknowledgements: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
}, { timestamps: true });




export default mongoose.model("Incident", incidentSchema);

