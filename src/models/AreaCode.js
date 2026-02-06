import mongoose from "mongoose";

const areaCodeSchema = new mongoose.Schema({
  code: { 
    type: String, 
    required: true, 
    unique: true, 
    uppercase: true,
    trim: true,
    minlength: 6,
    maxlength: 8
  },
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  description: { 
    type: String,
    default: ""
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  assignedAdmins: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  }],
  // Statistics
  totalUsers: { 
    type: Number, 
    default: 0 
  },
  totalIncidents: { 
    type: Number, 
    default: 0 
  }
}, { timestamps: true });

// Index for faster lookups
areaCodeSchema.index({ code: 1 });
areaCodeSchema.index({ isActive: 1 });

// Static method to generate unique area code
areaCodeSchema.statics.generateCode = async function(prefix = "") {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code;
  let exists = true;
  
  while (exists) {
    // Generate 6-character code
    let randomPart = "";
    for (let i = 0; i < 6; i++) {
      randomPart += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    code = prefix ? `${prefix}-${randomPart}` : randomPart;
    
    // Check if code already exists
    const existing = await this.findOne({ code });
    exists = !!existing;
  }
  
  return code;
};

// Method to check if admin has access to this area
areaCodeSchema.methods.hasAdminAccess = function(adminId) {
  return this.assignedAdmins.some(id => id.toString() === adminId.toString());
};

// Method to add admin to area
areaCodeSchema.methods.addAdmin = async function(adminId) {
  if (!this.hasAdminAccess(adminId)) {
    this.assignedAdmins.push(adminId);
    await this.save();
  }
  return this;
};

// Method to remove admin from area
areaCodeSchema.methods.removeAdmin = async function(adminId) {
  this.assignedAdmins = this.assignedAdmins.filter(
    id => id.toString() !== adminId.toString()
  );
  await this.save();
  return this;
};

export default mongoose.model("AreaCode", areaCodeSchema);
