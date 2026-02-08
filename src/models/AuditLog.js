import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  adminName: String,
  action: {
    type: String,
    required: true
  },
  targetType: {
    type: String,
    enum: ["incident", "user", "support", "system"],
    required: true
  },
  targetId: mongoose.Schema.Types.ObjectId,
  details: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

export default mongoose.model("AuditLog", auditLogSchema);
