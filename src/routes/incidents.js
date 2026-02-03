import express from "express";
import Incident from "../models/Incident.js";
import { authMiddleware, requireAdminOnly } from "../middleware/auth.js";
import { logAudit } from "../utils/auditLogger.js";
import { catchAsync } from "../utils/catchAsync.js";

import Notification from "../models/Notification.js";
import IncidentMessage from "../models/IncidentMessage.js";

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

// Get all conversations for the current user
router.get("/user/conversations", authMiddleware, catchAsync(async (req, res) => {
  // Find all messages where user is sender or receiver
  const messages = await IncidentMessage.find({
    $or: [{ senderId: req.user.id }, { receiverId: req.user.id }]
  }).sort({ createdAt: -1 });

  // Extract unique incident IDs
  const incidentIds = [...new Set(messages.map(m => m.incidentId.toString()))];

  // Fetch details for these incidents
  const incidents = await Incident.find({ _id: { $in: incidentIds } })
    .populate("userId", "name avatar") // Reporter details
    .sort({ updatedAt: -1 });

  // For each incident, attach the latest message relevant to this user
  const conversations = await Promise.all(incidents.map(async (incident) => {
    const lastMessage = messages.find(m => m.incidentId.toString() === incident._id.toString());
    
    // Count unread messages (optional optimization for later)
    // const unreadCount = messages.filter(m => m.incidentId.toString() === incident._id.toString() && m.receiverId.toString() === req.user.id && !m.read).length;

    return {
      ...incident.toObject(),
      lastMessage: lastMessage,
      otherParty: incident.userId.toString() === req.user.id 
        ? "Community Member" // If I am the reporter, I'm talking to community
        : incident.userId // If I am not reporter, I'm talking to reporter (which is populated)
    };
  }));

  res.json(conversations);
}));

// Get private messages for an incident
router.get("/:id/messages", authMiddleware, catchAsync(async (req, res) => {
  const incident = await Incident.findById(req.params.id);
  if (!incident) return res.status(404).json({ message: "Incident not found" });

  // Only return messages where the user is the sender OR the receiver (reporter)
  const messages = await IncidentMessage.find({
    incidentId: req.params.id,
    $or: [{ senderId: req.user.id }, { receiverId: req.user.id }]
  }).sort({ createdAt: 1 }).populate("senderId", "name profilePicture").populate("replies.senderId", "name profilePicture");

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

export default router;
