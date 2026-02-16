import mongoose from "mongoose";

const circleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { 
    type: String, 
    enum: ["Family", "Friends", "Hostel"], 
    required: true 
  },
  inviteCode: { type: String, required: true, unique: true },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    role: { type: String, enum: ["admin", "member"], default: "member" },
    joinedAt: { type: Date, default: Date.now }
  }],
  sharedIncidents: [{ type: mongoose.Schema.Types.ObjectId, ref: "Incident" }]
}, { timestamps: true });

export default mongoose.model("Circle", circleSchema);
