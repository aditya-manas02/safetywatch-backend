import mongoose from "mongoose";

const adSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  link: {
    type: String,
    required: true,
    trim: true
  },
  areaCode: {
    type: String,
    default: null // null or empty means GLOBAL
  },
  isActive: {
    type: Boolean,
    default: true
  },
  clicks: {
    type: Number,
    default: 0
  },
  expiresAt: {
    type: Date
  }
}, { timestamps: true });

const Ad = mongoose.model("Ad", adSchema);
export default Ad;
