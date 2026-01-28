import mongoose from "mongoose";

const incidentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  type: { type: String, enum: ["theft","vandalism","suspicious","assault","other"], required: true },
  location: { type: String, required: true },
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  status: { type: String, enum: ["pending","approved","rejected"], default: "pending" },
  imageUrl: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});


incidentSchema.pre("save", function(next){
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model("Incident", incidentSchema);

