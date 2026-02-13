import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    default: null // null indicates a global announcement
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { 
    type: String, 
    enum: ["announcement", "incident_update", "system_alert"], 
    default: "system_alert" 
  },
  isRead: { type: Boolean, default: false },
  link: { type: String, default: null },
}, { timestamps: true });

// Automatically delete notifications after 48 hours (172800 seconds)
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 172800 });

export default mongoose.model("Notification", notificationSchema);
