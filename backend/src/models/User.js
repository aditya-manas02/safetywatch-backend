import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  roles: { 
  type: [String], 
  enum: ["user", "admin", "superadmin"], 
  default: ["user"] 
}
 // e.g. ['user'] or ['user','admin']
});

export default mongoose.model("User", userSchema);
