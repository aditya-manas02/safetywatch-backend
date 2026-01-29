import mongoose from "mongoose";

const supportMessageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ["general", "feedback", "incident-help", "account-issue", "other"],
    default: "general"
  },
  subject: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ["unread", "read", "resolved"],
    default: "unread"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model("SupportMessage", supportMessageSchema);
