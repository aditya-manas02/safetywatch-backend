import mongoose from "mongoose";

const contentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  body: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: ["Tip", "Guideline", "Announcement"],
    default: "Tip",
  },
  author: {
    type: String,
    default: "SafetyWatch Core",
  },
  icon: {
    type: String,
    default: "Shield",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Content = mongoose.model("Content", contentSchema);

export default Content;
