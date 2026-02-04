import express from "express";
import Incident from "../models/Incident.js";
import { authMiddleware, requireAdminOnly } from "../middleware/auth.js";
import { logAudit } from "../utils/auditLogger.js";
import { catchAsync } from "../utils/catchAsync.js";

import Notification from "../models/Notification.js";
import IncidentMessage from "../models/IncidentMessage.js";
import User from "../models/User.js";
import Report from "../models/Report.js";

const router = express.Router();

// Simple spam detection helper
const isSpam = (text) => {
  if (!text || text.length < 3) return true;
  // Check for gibberish: low vowel ratio (not perfect but catches things like "vdhwjfn")
  const vowels = text.match(/[aeiou]/gi);
  const vowelCount = vowels ? vowels.length : 0;
  const ratio = vowelCount / text.length;
  if (ratio < 0.1 && text.length > 5) return true;
  // Check for repeating characters
  if (/(.)\1{4,}/.test(text)) return true;
  return false;
};

/* ----------------- CREATE INCIDENT ------------------ */
router.post("/", authMiddleware, catchAsync(async (req, res) => {
  const { title, description } = req.body;

  // Auto-reject Spam
  if (isSpam(title) || isSpam(description)) {
    const rejectedIncident = await Incident.create({
      userId: req.user.id,
      title: req.body.title,
      description: req.body.description,
      type: req.body.type,
      location: req.body.location,
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      imageUrl: req.body.imageUrl || null,
      allowMessages: req.body.allowMessages !== undefined ? req.body.allowMessages : true,
      status: "rejected",
      locationPoint: {
        type: "Point",
        coordinates: [req.body.longitude || 0, req.body.latitude || 0]
      }
    });

    await Notification.create({
      userId: req.user.id,
      title: "Report Automatically Rejected",
      message: `Your report "${title}" was rejected because it appears to be spam or contains invalid text.`,
      type: "incident_update",
      link: `/profile?tab=reports`
    });

    return res.status(400).json({ 
      message: "Report rejected as spam. Please provide clear, meaningful details.",
      incident: rejectedIncident 
    });
  }

  const incident = await Incident.create({
    userId: req.user.id,
    title: req.body.title,
    description: req.body.description,
    type: req.body.type,
    location: req.body.location,
    latitude: req.body.latitude,
    longitude: req.body.longitude,
    imageUrl: req.body.imageUrl || null,
    allowMessages: req.body.allowMessages !== undefined ? req.body.allowMessages : true,
    status: "pending",
    locationPoint: {
      type: "Point",
      coordinates: [req.body.longitude || 0, req.body.latitude || 0]
    }
  });

  res.status(201).json(incident);
}));

/* ----------------- GET INCIDENTS (ADMIN OR USER) ------------------ */
router.get("/", authMiddleware, catchAsync(async (req, res) => {
  if (req.user.isAdmin) {
    const all = await Incident.find().sort({ createdAt: -1 });
    return res.json(all);
  }

  const incidents = await Incident.find({
    $or: [{ status: { $in: ["approved", "problem solved"] } }, { userId: req.user.id }],
  }).sort({ createdAt: -1 });

  res.json(incidents);
}));

/* ---------------- GET MY REPORTS ---------------- */
router.get("/my-reports", authMiddleware, catchAsync(async (req, res) => {
  const myReports = await Incident.find({ userId: req.user.id }).sort({ createdAt: -1 });
  res.json(myReports);
}));

/* ---------------- GET POPULAR INCIDENTS ---------------- */
router.get("/popular", catchAsync(async (req, res) => {
  const popular = await Incident.find({ 
    isImportant: true, 
    status: { $in: ["approved", "problem solved"] } 
  }).sort({ createdAt: -1 }).limit(10);
  res.json(popular);
}));

/* ---------------- GET NEARBY INCIDENTS ---------------- */
router.get("/near-me", catchAsync(async (req, res) => {
  const { lat, lng, radius = 10 } = req.query; // radius in km
  
  if (!lat || !lng) {
    return res.status(400).json({ message: "Latitude and longitude are required" });
  }

  // Simplified "near me" using a square bounding box instead of exact circle for performance
  // 1 degree ~ 111km
  const latDelta = radius / 111;
  const lngDelta = radius / (111 * Math.cos(lat * Math.PI / 180));

  const nearby = await Incident.find({
    status: { $in: ["approved", "problem solved"] },
    latitude: { $gte: parseFloat(lat) - latDelta, $lte: parseFloat(lat) + latDelta },
    longitude: { $gte: parseFloat(lng) - lngDelta, $lte: parseFloat(lng) + lngDelta }
  }).sort({ createdAt: -1 }).limit(15);

  res.json(nearby);
}));

/* ---------------- PUBLIC INCIDENTS ---------------- */
router.get("/public", catchAsync(async (req, res) => {
  const list = await Incident.find({ status: "approved" }).sort({
    createdAt: -1,
  });
  res.json(list);
}));

/* --------- HOMEPAGE LATEST INCIDENTS ----------- */
router.get("/latest", async (req, res) => {
  try {
    const items = await Incident.find({ status: "approved" })
      .sort({ createdAt: -1 })
      .limit(3);

    res.json(items);
  } catch {
    res.status(500).json({ message: "Error fetching latest incidents" });
  }
});

/* --------- REAL HEATMAP COORDINATES ----------- */
router.get("/coords/all", async (req, res) => {
  try {
    const coords = await Incident.find(
      { status: "approved" },
      { latitude: 1, longitude: 1, _id: 0 }
    );

    res.json(coords);
  } catch (err) {
    console.error("Error fetching heatmap coords:", err);
    res.status(500).json({ message: "Error fetching heatmap coords" });
  }
});

/* --------- BULK UPDATE STATUS (ADMIN ONLY) ---------- */
router.patch("/bulk-status", authMiddleware, requireAdminOnly, async (req, res) => {
  try {
    const { ids, status, isImportant } = req.body;
    if (!Array.isArray(ids)) {
      return res.status(400).json({ message: "Invalid request data" });
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (typeof isImportant === "boolean") updateData.isImportant = isImportant;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "No update data provided" });
    }

    const updatedItems = await Incident.find({ _id: { $in: ids } });
    
    await Incident.updateMany(
      { _id: { $in: ids } },
      updateData
    );

    // Notify users if status changed
    if (status) {
      for (const item of updatedItems) {
        await Notification.create({
          userId: item.userId,
          title: `Report ${status.charAt(0).toUpperCase() + status.slice(1)}`,
          message: `Your report "${item.title}" has been updated to ${status} by an administrator.`,
          type: "incident_update",
          link: `/profile?tab=reports`
        });
      }
    }

    await logAudit(req, `Bulk updated ${updatedItems.length} incidents: ${JSON.stringify(updateData)}`, "system", null, ids.join(", "));

    // Delete messages if status is problem solved
    if (status === "problem solved") {
      await IncidentMessage.deleteMany({ incidentId: { $in: ids } });
    }

    res.json({ message: `Bulk updated ${updatedItems.length} incidents` });
  } catch (err) {
    res.status(500).json({ message: "Error in bulk update" });
  }
});
/* --------- UPDATE STATUS (ADMIN OR REPORTER) ---------- */
router.patch("/:id/status", authMiddleware, async (req, res) => {
  try {
    const { status, isImportant } = req.body;
    
    // Find the incident first to check ownership
    const incident = await Incident.findById(req.params.id);
    if (!incident)
      return res.status(404).json({ message: "Incident not found" });

    // Permissions check: Admin can do anything. Reporter can only update status to 'problem solved' or 'rejected' (archive)
    const isReporter = incident.userId.toString() === req.user.id.toString();
    const isAdmin = req.user.isAdmin;

    if (!isAdmin && !isReporter) {
      return res.status(403).json({ message: "Not authorized to update this incident" });
    }

    const updateData = {};
    if (status) {
      // Reporters can only set status to 'problem solved', 'rejected', or restore to 'pending' (unarchive)
      const allowedReporterStatuses = ["problem solved", "rejected", "pending"];
      if (!isAdmin && !allowedReporterStatuses.includes(status)) {
        return res.status(403).json({ message: "Reporters can only resolve, archive, or unarchive incidents" });
      }
      updateData.status = status;
    }

    // Only admins can change importance
    if (typeof isImportant === "boolean") {
      if (!isAdmin) {
        return res.status(403).json({ message: "Only administrators can mark incidents as important" });
      }
      updateData.isImportant = isImportant;
    }

    const updated = await Incident.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    // Notify user if status changed by admin
    if (status && isAdmin && !isReporter) {
      await Notification.create({
        userId: updated.userId,
        title: `Report ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        message: `Your report "${updated.title}" has been updated to ${status} by an administrator.`,
        type: "incident_update",
        link: `/profile?tab=reports`
      });
    }

    await logAudit(req, `Updated incident ${req.params.id}: ${JSON.stringify(updateData)}`, "incident", req.params.id);

    // Delete messages if status is problem solved
    if (status === "problem solved") {
      await IncidentMessage.deleteMany({ incidentId: req.params.id });
    }

    res.json(updated);
  } catch (err) {
    console.error("Error updating status:", err);
    res.status(500).json({ message: "Error updating status" });
  }
});

/* ---------------- DELETE INCIDENT ---------------- */
router.delete("/:id", authMiddleware, requireAdminOnly, async (req, res) => {
  try {
    const deleted = await Incident.findByIdAndDelete(req.params.id);
    if (deleted) {
      await logAudit(req, "Deleted incident", "incident", req.params.id, deleted.title);
      // Clean up associated messages
      await IncidentMessage.deleteMany({ incidentId: req.params.id });
    }
    res.json({ message: "Deleted successfully" });
  } catch {
    res.status(500).json({ message: "Error deleting incident" });
  }
});

/* ---------------- ACKNOWLEDGE INCIDENT ---------------- */
router.patch("/:id/acknowledge", authMiddleware, catchAsync(async (req, res) => {
  const incident = await Incident.findByIdAndUpdate(
    req.params.id,
    { $addToSet: { acknowledgements: req.user.id } },
    { new: true }
  );

  if (!incident) return res.status(404).json({ message: "Incident not found" });

  // Log the action for audit
  await logAudit(req, `Acknowledged incident ${req.params.id}`, "incident", req.params.id);
  
  res.json({ 
    message: "Successfully acknowledged", 
    acknowledgements: incident.acknowledgements?.length || 0 
  });
}));

/* ---------------- PUBLIC HOMEPAGE STATS ---------------- */
router.get("/stats/public", async (req, res) => {
  try {
    const total = await Incident.countDocuments();
    const active = await Incident.countDocuments({ status: "pending" });
    const approved = await Incident.countDocuments({ status: "approved" });

    res.json({ total, active, approved });
  } catch {
    res.status(500).json({ message: "Error loading stats" });
  }
});

/* ---------------- MESSAGING ROUTES ---------------- */

// Get all conversations for the current user (1-on-1 chats)
router.get("/user/conversations", authMiddleware, catchAsync(async (req, res) => {
  // Find all messages where user is involved
  const messages = await IncidentMessage.find({
    $or: [{ senderId: req.user.id }, { receiverId: req.user.id }]
  }).sort({ createdAt: -1 });

  // Map to group by [incidentId, otherUserId]
  const threadMap = new Map();

  messages.forEach(msg => {
    const otherUserId = msg.senderId.toString() === req.user.id.toString() 
      ? msg.receiverId.toString() 
      : msg.senderId.toString();
    
    const key = `${msg.incidentId}_${otherUserId}`;
    
    if (!threadMap.has(key)) {
      threadMap.set(key, {
        incidentId: msg.incidentId,
        otherUserId: otherUserId,
        lastMessage: msg
      });
    }
  });

  const threads = Array.from(threadMap.values());

  // Fetch unique incident and user details
  const incidentIds = [...new Set(threads.map(t => t.incidentId.toString()))];
  const otherUserIds = [...new Set(threads.map(t => t.otherUserId.toString()))];

  const [incidents, otherUsers] = await Promise.all([
    Incident.find({ _id: { $in: incidentIds } }).populate("userId", "name profilePicture"),
    User.find({ _id: { $in: otherUserIds } }, "name profilePicture")
  ]);

  const conversations = threads.map(thread => {
    const incident = incidents.find(i => i._id.toString() === thread.incidentId.toString());
    const otherUser = otherUsers.find(u => u._id.toString() === thread.otherUserId.toString());

    if (!incident) return null;

    return {
      ...incident.toObject(),
      lastMessage: thread.lastMessage,
      otherParty: otherUser || { name: "Community Member", _id: thread.otherUserId }
    };
  }).filter(Boolean);

  res.json(conversations);
}));

// Get private messages for an incident (optionally filtered by a specific 1-on-1 thread)
router.get("/:id/messages", authMiddleware, catchAsync(async (req, res) => {
  const { withUser } = req.query;
  const incident = await Incident.findById(req.params.id);
  if (!incident) return res.status(404).json({ message: "Incident not found" });

  const query = {
    incidentId: req.params.id
  };

  if (withUser) {
    // Strictly fetch messages between current user and specified user
    query.$or = [
      { senderId: req.user.id, receiverId: withUser },
      { senderId: withUser, receiverId: req.user.id }
    ];
  } else {
    // Legacy/Fallback: fetch all messages where user is involved for this incident
    query.$or = [{ senderId: req.user.id }, { receiverId: req.user.id }];
  }

  const messages = await IncidentMessage.find(query)
    .sort({ createdAt: 1 })
    .populate("senderId", "name profilePicture")
    .populate("replies.senderId", "name profilePicture");

  res.json(messages);
}));

// Send a private message or reply to the reporter
router.post("/:id/messages", authMiddleware, catchAsync(async (req, res) => {
  const { content, receiverId: explicitReceiverId } = req.body;
  const incident = await Incident.findById(req.params.id);

  if (!incident) return res.status(404).json({ message: "Incident not found" });
  if (!incident.allowMessages) return res.status(403).json({ message: "Messages are disabled for this report" });
  if (incident.status === "problem solved") return res.status(403).json({ message: "Report is resolved. No new messages allowed." });

  let receiverId = explicitReceiverId || incident.userId;

  // If the reporter is sending a message (broadcasting/replying)
  if (incident.userId.toString() === req.user.id.toString()) {
    if (explicitReceiverId) {
      receiverId = explicitReceiverId;
    } else {
      // Find the most recent message received by the reporter for this incident
      // to determine who they are talking to in this 1-on-1 context.
      const lastReceived = await IncidentMessage.findOne({
        incidentId: req.params.id,
        receiverId: req.user.id
      }).sort({ createdAt: -1 });

      if (lastReceived) {
        receiverId = lastReceived.senderId;
      } else {
        // Fallback or broadcast logic. For now, if no one messaged, we might just error
        // or allow it as a broadcast (though schema requires a receiver).
        return res.status(400).json({ message: "Need a recipient to send a message." });
      }
    }
  }

  const message = await IncidentMessage.create({
    incidentId: req.params.id,
    senderId: req.user.id,
    receiverId,
    content
  });

  // Notify the receiver
  await Notification.create({
    userId: receiverId,
    title: "New Private Message",
    message: `New message regarding report "${incident.title}".`,
    type: "incident_update",
    link: `/inbox?incident=${incident._id}`
  });

  res.status(201).json(message);
}));

// Reply to a private message (Reporter or Original Sender)
router.post("/:id/messages/:messageId/reply", authMiddleware, catchAsync(async (req, res) => {
  const { content } = req.body;
  const message = await IncidentMessage.findById(req.params.messageId);

  if (!message) return res.status(404).json({ message: "Message not found" });

  // Only the original sender or the original receiver (reporter) can reply
  if (message.senderId.toString() !== req.user.id.toString() && message.receiverId.toString() !== req.user.id.toString()) {
    return res.status(403).json({ message: "Not authorized to reply to this message" });
  }

  message.replies.push({
    senderId: req.user.id,
    content
  });

  await message.save();

  // Notify the other party
  const notifyId = message.senderId.toString() === req.user.id.toString() ? message.receiverId : message.senderId;
  await Notification.create({
    userId: notifyId,
    title: "New Reply",
    message: `You have a new reply in a private conversation.`,
    type: "incident_update",
    link: `/profile?tab=reports`
  });

  res.status(201).json(message);
}));

/* ---------------- DELETE CHAT THREAD ---------------- */
router.delete("/:id/messages/:otherUserId", authMiddleware, catchAsync(async (req, res) => {
  const { id: incidentId, otherUserId } = req.params;

  // Delete all messages between current user and otherUserId for this incident
  const deleted = await IncidentMessage.deleteMany({
    incidentId,
    $or: [
      { senderId: req.user.id, receiverId: otherUserId },
      { senderId: otherUserId, receiverId: req.user.id }
    ]
  });

  await logAudit(req, `Deleted chat thread with user ${otherUserId} for incident ${incidentId}`, "incident", incidentId);

  res.json({ message: `Successfully deleted ${deleted.deletedCount} messages` });
}));

/* ---------------- REPORT CHAT/USER ---------------- */
router.post("/:id/report", authMiddleware, catchAsync(async (req, res) => {
  const { id: incidentId } = req.params;
  const { reportedUserId, messageId, reason } = req.body;

  if (!reportedUserId || !reason) {
    return res.status(400).json({ message: "Reported user ID and reason are required" });
  }

  // Fetch chat history between reporter and reported user for this incident
  const messages = await IncidentMessage.find({
    incidentId,
    $or: [
      { senderId: req.user.id, receiverId: reportedUserId },
      { senderId: reportedUserId, receiverId: req.user.id }
    ]
  }).sort({ createdAt: 1 });

  const chatSnapshot = messages.map(m => ({
    senderId: m.senderId,
    content: m.content,
    createdAt: m.createdAt
  }));

  const report = await Report.create({
    reporterId: req.user.id,
    reportedUserId,
    incidentId,
    messageId,
    reason,
    chatSnapshot
  });

  await logAudit(req, `Created report against user ${reportedUserId} for incident ${incidentId}`, "user_report", reportedUserId);

  res.status(201).json({ message: "Report submitted successfully", report });
}));

/* ---------------- ADMIN: GET ALL REPORTS ---------------- */
router.get("/admin/reports", authMiddleware, requireAdminOnly, catchAsync(async (req, res) => {
  const reports = await Report.find()
    .populate("reporterId", "name email")
    .populate("reportedUserId", "name email")
    .populate("incidentId", "title")
    .populate("messageId", "content")
    .sort({ createdAt: -1 });

  res.json(reports);
}));

/* ---------------- ADMIN: TAKE ACTION ON REPORT ---------------- */
router.post("/admin/reports/:reportId/action", authMiddleware, requireAdminOnly, catchAsync(async (req, res) => {
  const { action, reason, suspensionDays } = req.body; // action: 'warn', 'suspend', 'dismiss'
  const { reportId } = req.params;

  const report = await Report.findById(reportId).populate("incidentId"); // Populated incidentId
  if (!report) return res.status(404).json({ message: "Report not found" });

  const reportedUser = await User.findById(report.reportedUserId);
  if (!reportedUser) return res.status(404).json({ message: "Reported user not found" });

  const incidentTitle = report.incidentId?.title || "a reported incident"; // Get incident title

  if (action === "warn") {
    reportedUser.warnings.push({
      reason,
      adminId: req.user.id
    });
    report.adminAction = "warned";

    await Notification.create({
      userId: reportedUser._id,
      title: "Account Warning",
      message: `You have received a warning regarding your report on "${incidentTitle}". Reason: ${reason}`,
      type: "system_alert" // Fixed enum
    });
  } else if (action === "suspend") {
    reportedUser.isSuspended = true;
    if (suspensionDays) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(suspensionDays));
      reportedUser.suspensionExpiresAt = expiresAt;
    } else {
      reportedUser.suspensionExpiresAt = null; // Indefinite
    }
    report.adminAction = "suspended";

    await Notification.create({
      userId: reportedUser._id,
      title: "Account Suspended",
      message: `Your account has been suspended${suspensionDays ? ` for ${suspensionDays} days` : ' indefinitely'} regarding your report on "${incidentTitle}". Reason: ${reason}`,
      type: "system_alert" // Fixed enum
    });
  } else if (action === "dismiss") {
    report.adminAction = "none";
  }

  report.status = "resolved";
  report.reviewedBy = req.user.id;
  report.reviewedAt = new Date();

  await Promise.all([reportedUser.save(), report.save()]);

  await logAudit(req, `Admin action taken on report ${reportId}: ${action}`, "admin_action", reportedUser._id);

  res.json({ message: `Action '${action}' applied successfully` });
}));

/* ---------------- ADMIN: DELETE REPORT ---------------- */
router.delete("/admin/reports/:reportId", authMiddleware, requireAdminOnly, catchAsync(async (req, res) => {
  const { reportId } = req.params;
  const deleted = await Report.findByIdAndDelete(reportId);
  if (!deleted) return res.status(404).json({ message: "Report not found" });

  await logAudit(req, `Admin deleted report ${reportId}`, "admin_action", deleted.reportedUserId);

  res.json({ message: "Report deleted successfully" });
}));

export default router;
