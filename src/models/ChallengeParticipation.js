import mongoose from "mongoose";

const challengeParticipationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  challengeId: { type: mongoose.Schema.Types.ObjectId, ref: "Challenge", required: true },
  currentValue: { type: Number, default: 0 },
  isCompleted: { type: Boolean, default: false },
  completedAt: { type: Date },
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

// Ensure a user can only have one participation record per challenge
challengeParticipationSchema.index({ userId: 1, challengeId: 1 }, { unique: true });

export default mongoose.model("ChallengeParticipation", challengeParticipationSchema);
