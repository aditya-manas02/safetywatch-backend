import AuditLog from "../models/AuditLog.js";

export const logAudit = async (req, action, targetType, targetId, details = "") => {
  try {
    await AuditLog.create({
      adminId: req.user.id,
      adminName: req.user.name || "Admin",
      action,
      targetType,
      targetId,
      details
    });
  } catch (err) {
    console.error("Failed to create audit log:", err);
  }
};
