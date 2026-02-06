import express from "express";
import AreaCode from "../models/AreaCode.js";
import User from "../models/User.js";
import Incident from "../models/Incident.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Middleware to check if user is superadmin
const requireSuperAdmin = (req, res, next) => {
  if (!req.user.roles.includes("superadmin")) {
    return res.status(403).json({ error: "Access denied. SuperAdmin only." });
  }
  next();
};

// Generate new area code (SuperAdmin only)
router.post("/generate", authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { name, description, prefix } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: "Area name is required (minimum 2 characters)" });
    }

    // Generate unique code
    const code = await AreaCode.generateCode(prefix || "");

    const areaCode = new AreaCode({
      code,
      name: name.trim(),
      description: description || "",
      createdBy: req.user.userId,
      isActive: true
    });

    await areaCode.save();

    res.status(201).json({
      message: "Area code generated successfully",
      areaCode: {
        _id: areaCode._id,
        code: areaCode.code,
        name: areaCode.name,
        description: areaCode.description,
        isActive: areaCode.isActive,
        createdAt: areaCode.createdAt
      }
    });
  } catch (error) {
    console.error("Error generating area code:", error);
    res.status(500).json({ error: "Failed to generate area code" });
  }
});

// Get all area codes (SuperAdmin only)
router.get("/", authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const areaCodes = await AreaCode.find()
      .populate("createdBy", "name email")
      .populate("assignedAdmins", "name email")
      .sort({ createdAt: -1 });

    res.json(areaCodes);
  } catch (error) {
    console.error("Error fetching area codes:", error);
    res.status(500).json({ error: "Failed to fetch area codes" });
  }
});

// Get single area code details (SuperAdmin only)
router.get("/:id", authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const areaCode = await AreaCode.findById(req.params.id)
      .populate("createdBy", "name email")
      .populate("assignedAdmins", "name email");

    if (!areaCode) {
      return res.status(404).json({ error: "Area code not found" });
    }

    res.json(areaCode);
  } catch (error) {
    console.error("Error fetching area code:", error);
    res.status(500).json({ error: "Failed to fetch area code" });
  }
});

// Validate area code (public - used during login)
router.get("/validate/:code", async (req, res) => {
  try {
    const { code } = req.params;
    const areaCode = await AreaCode.findOne({ 
      code: code.toUpperCase(), 
      isActive: true 
    });

    if (!areaCode) {
      return res.status(404).json({ 
        valid: false, 
        error: "Invalid or inactive area code" 
      });
    }

    res.json({
      valid: true,
      areaCode: {
        code: areaCode.code,
        name: areaCode.name,
        description: areaCode.description
      }
    });
  } catch (error) {
    console.error("Error validating area code:", error);
    res.status(500).json({ error: "Failed to validate area code" });
  }
});

// Assign area code to admin (SuperAdmin only)
router.patch("/:id/assign", authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { adminIds } = req.body;

    if (!Array.isArray(adminIds) || adminIds.length === 0) {
      return res.status(400).json({ error: "Admin IDs array is required" });
    }

    const areaCode = await AreaCode.findById(req.params.id);
    if (!areaCode) {
      return res.status(404).json({ error: "Area code not found" });
    }

    // Verify all users are admins
    const admins = await User.find({ 
      _id: { $in: adminIds },
      roles: "admin"
    });

    if (admins.length !== adminIds.length) {
      return res.status(400).json({ error: "Some users are not admins" });
    }

    // Add admins to area code
    for (const adminId of adminIds) {
      await areaCode.addAdmin(adminId);
      
      // Update admin's assignedAreaCodes
      await User.findByIdAndUpdate(adminId, {
        $addToSet: { assignedAreaCodes: areaCode.code }
      });
    }

    const updatedAreaCode = await AreaCode.findById(req.params.id)
      .populate("assignedAdmins", "name email");

    res.json({
      message: "Admins assigned successfully",
      areaCode: updatedAreaCode
    });
  } catch (error) {
    console.error("Error assigning admins:", error);
    res.status(500).json({ error: "Failed to assign admins" });
  }
});

// Remove admin from area code (SuperAdmin only)
router.patch("/:id/remove-admin", authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { adminId } = req.body;

    if (!adminId) {
      return res.status(400).json({ error: "Admin ID is required" });
    }

    const areaCode = await AreaCode.findById(req.params.id);
    if (!areaCode) {
      return res.status(404).json({ error: "Area code not found" });
    }

    await areaCode.removeAdmin(adminId);

    // Remove from admin's assignedAreaCodes
    await User.findByIdAndUpdate(adminId, {
      $pull: { assignedAreaCodes: areaCode.code }
    });

    const updatedAreaCode = await AreaCode.findById(req.params.id)
      .populate("assignedAdmins", "name email");

    res.json({
      message: "Admin removed successfully",
      areaCode: updatedAreaCode
    });
  } catch (error) {
    console.error("Error removing admin:", error);
    res.status(500).json({ error: "Failed to remove admin" });
  }
});

// Toggle area code active status (SuperAdmin only)
router.patch("/:id/toggle-status", authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const areaCode = await AreaCode.findById(req.params.id);
    if (!areaCode) {
      return res.status(404).json({ error: "Area code not found" });
    }

    areaCode.isActive = !areaCode.isActive;
    await areaCode.save();

    res.json({
      message: `Area code ${areaCode.isActive ? 'activated' : 'deactivated'} successfully`,
      areaCode
    });
  } catch (error) {
    console.error("Error toggling area code status:", error);
    res.status(500).json({ error: "Failed to toggle area code status" });
  }
});

// Update area code statistics (internal use)
router.patch("/:code/update-stats", async (req, res) => {
  try {
    const { code } = req.params;
    const areaCode = await AreaCode.findOne({ code: code.toUpperCase() });

    if (!areaCode) {
      return res.status(404).json({ error: "Area code not found" });
    }

    // Count users and incidents
    const totalUsers = await User.countDocuments({ areaCode: code.toUpperCase() });
    const totalIncidents = await Incident.countDocuments({ areaCode: code.toUpperCase() });

    areaCode.totalUsers = totalUsers;
    areaCode.totalIncidents = totalIncidents;
    await areaCode.save();

    res.json({ message: "Statistics updated", areaCode });
  } catch (error) {
    console.error("Error updating statistics:", error);
    res.status(500).json({ error: "Failed to update statistics" });
  }
});

// Delete area code (SuperAdmin only - soft delete by deactivating)
router.delete("/:id", authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const areaCode = await AreaCode.findById(req.params.id);
    if (!areaCode) {
      return res.status(404).json({ error: "Area code not found" });
    }

    // Check if area code has users or incidents
    const userCount = await User.countDocuments({ areaCode: areaCode.code });
    const incidentCount = await Incident.countDocuments({ areaCode: areaCode.code });

    if (userCount > 0 || incidentCount > 0) {
      return res.status(400).json({ 
        error: "Cannot delete area code with existing users or incidents. Deactivate instead.",
        userCount,
        incidentCount
      });
    }

    await AreaCode.findByIdAndDelete(req.params.id);

    res.json({ message: "Area code deleted successfully" });
  } catch (error) {
    console.error("Error deleting area code:", error);
    res.status(500).json({ error: "Failed to delete area code" });
  }
});

export default router;
