import mongoose from "mongoose";

const reportSchema = new mongoose.Schema({
  reporterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  reportedUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  incidentId: { type: mongoose.Schema.Types.ObjectId, ref: "Incident", required: true },
  messageId: { type: mongoose.Schema.Types.ObjectId, ref: "IncidentMessage" },
  reason: { type: String, required: true },
  status: { 
    type: String, 
    enum: ["pending", "reviewed", "resolved"], 
    default: "pending" 
  },
  adminAction: {
    type: String,
    enum: ["none", "warned", "suspended"],
    default: "none"
  },
  chatSnapshot: [{
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    content: String,
    createdAt: Date
  }],
  screenshot: { type: String }, // URL of the uploaded screenshot
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  reviewedAt: { type: Date }
}, { timestamps: true });

export default mongoose.model("Report", reportSchema);
