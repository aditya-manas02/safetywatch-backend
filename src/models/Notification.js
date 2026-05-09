import mongoose from "mongoose";
import { sendPushNotification } from "../services/pushNotificationService.js";

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
  targetAreaCodes: [{ type: String, uppercase: true }], // If empty, it's global (or strictly for global if userId is null)
  _skipPush: { type: Boolean, default: false, select: false } // Internal flag to skip push trigger
}, { timestamps: true });

// Automatically delete notifications after 48 hours (172800 seconds)
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 172800 });

// Trigger Push Notification automatically upon creation
notificationSchema.post("save", async function (doc) {
  // Allow skipping push (e.g. if already sent manually or not needed)
  if (doc._skipPush) return;

  try {
    const User = mongoose.model("User");
    let tokens = [];

    if (doc.userId) {
      // Notification targeted to specific user
      const user = await User.findById(doc.userId);
      if (user && user.fcmTokens) {
        tokens = user.fcmTokens;
      }
    } else if (doc.targetAreaCodes && doc.targetAreaCodes.length > 0) {
      // Area-specific notification
      const users = await User.find({ areaCode: { $in: doc.targetAreaCodes }, fcmTokens: { $exists: true, $not: { $size: 0 } } });
      users.forEach(u => tokens.push(...u.fcmTokens));
    } else {
      // Global announcement
      const users = await User.find({ fcmTokens: { $exists: true, $not: { $size: 0 } } });
      users.forEach(u => tokens.push(...u.fcmTokens));
    }

    // De-duplicate tokens
    tokens = [...new Set(tokens)];

    if (tokens.length > 0) {
      await sendPushNotification(tokens, {
        title: doc.title,
        body: doc.message,
        data: { link: doc.link || "", type: doc.type }
      });
    }
  } catch (err) {
    console.error("[PUSH] Error triggering push hook:", err);
  }
});

export default mongoose.model("Notification", notificationSchema);
