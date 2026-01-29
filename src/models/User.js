import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  name: { type: String, required: true },
  phone: { type: String },
  passwordHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  roles: { 
    type: [String], 
    enum: ["user", "admin", "superadmin"], 
    default: ["user"] 
  }
});

export default mongoose.model("User", userSchema);
