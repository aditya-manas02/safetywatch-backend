import express from "express";
import SystemConfig from "../models/SystemConfig.js";
import { authMiddleware, requireSuperAdmin } from "../middleware/auth.js";
import { catchAsync } from "../utils/catchAsync.js";
import { logAudit } from "../utils/auditLogger.js";

const router = express.Router();

/**
 * GET /api/system/config
 * Public: Get current system status (maintenance mode, etc.)
 */
router.get("/config", catchAsync(async (req, res) => {
  const config = await SystemConfig.getOrCreateConfig();
  res.json({
    isMaintenanceMode: config.isMaintenanceMode,
    maintenanceMessage: config.maintenanceMessage,
    maintenanceExpectedBackAt: config.maintenanceExpectedBackAt,
    preAlertActive: config.preAlertActive,
    preAlertMessage: config.preAlertMessage,
    preAlertStartTime: config.preAlertStartTime,
    preAlertEndTime: config.preAlertEndTime
  });
}));

/**
 * PATCH /api/system/maintenance
 * Super Admin: Toggle maintenance mode and set expected back time
 */
router.patch("/maintenance", authMiddleware, requireSuperAdmin, catchAsync(async (req, res) => {
  const { 
    isMaintenanceMode, 
    maintenanceMessage, 
    maintenanceExpectedBackAt,
    preAlertActive,
    preAlertMessage,
    preAlertStartTime,
    preAlertEndTime
  } = req.body;
  
  const config = await SystemConfig.getOrCreateConfig();
  
  if (typeof isMaintenanceMode === 'boolean') config.isMaintenanceMode = isMaintenanceMode;
  if (maintenanceMessage) config.maintenanceMessage = maintenanceMessage;
  if (maintenanceExpectedBackAt !== undefined) config.maintenanceExpectedBackAt = maintenanceExpectedBackAt;
  
  if (typeof preAlertActive === 'boolean') config.preAlertActive = preAlertActive;
  if (preAlertMessage) config.preAlertMessage = preAlertMessage;
  if (preAlertStartTime !== undefined) config.preAlertStartTime = preAlertStartTime;
  if (preAlertEndTime !== undefined) config.preAlertEndTime = preAlertEndTime;
  
  config.lastUpdatedBy = req.user.id;
  await config.save();

  await logAudit(
    req, 
    `Maintenance Mode ${config.isMaintenanceMode ? 'ENABLED' : 'DISABLED'}. Back at: ${config.maintenanceExpectedBackAt || 'N/A'}`, 
    "system", 
    config._id
  );

  res.json({
    message: `Maintenance Mode ${config.isMaintenanceMode ? 'enabled' : 'disabled'}`,
    config
  });
}));

export default router;
