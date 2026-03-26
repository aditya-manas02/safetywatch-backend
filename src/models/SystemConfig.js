import mongoose from "mongoose";

const systemConfigSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    default: "main_config"
  },
  isMaintenanceMode: {
    type: Boolean,
    default: false
  },
  maintenanceMessage: {
    type: String,
    default: "The system is currently undergoing scheduled maintenance. We'll be back shortly."
  },
  maintenanceExpectedBackAt: {
    type: Date,
    default: null
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }
}, { timestamps: true });

// Ensure we only have one config document
systemConfigSchema.statics.getOrCreateConfig = async function () {
  let config = await this.findOne({ key: "main_config" });
  if (!config) {
    config = await this.create({ key: "main_config" });
  }
  return config;
};

export default mongoose.model("SystemConfig", systemConfigSchema);
