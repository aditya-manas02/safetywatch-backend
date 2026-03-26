import mongoose from "mongoose";

const circleMessageSchema = new mongoose.Schema({
  circle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Circle",
    required: true,
    index: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  messageType: {
    type: String,
    enum: ["text", "image", "alert", "system"],
    default: "text"
  },
  attachments: [{
    type: String
  }],
  metadata: {
    incidentId: { type: mongoose.Schema.Types.ObjectId, ref: "Incident" }
  }
}, { timestamps: true });

// Index for performance on message history fetches
circleMessageSchema.index({ circle: 1, createdAt: -1 });

export default mongoose.model("CircleMessage", circleMessageSchema);
