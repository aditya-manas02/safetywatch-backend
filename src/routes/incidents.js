import express from "express";
import Incident from "../models/Incident.js";
import { authMiddleware, requireAdminOnly } from "../middleware/auth.js";
import { logAudit } from "../utils/auditLogger.js";

const router = express.Router();

/* ----------------- CREATE INCIDENT ------------------ */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const incident = await Incident.create({
      userId: req.user.id,
      title: req.body.title,
      description: req.body.description,
      type: req.body.type,
      location: req.body.location,
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      imageUrl: req.body.imageUrl || null,
      status: "pending",
    });

    res.status(201).json(incident);
  } catch (err) {
    console.error("Create Incident Error Details:", {
      message: err.message,
      stack: err.stack,
      body: req.body,
      user: req.user
    });
    res.status(500).json({ message: "Error creating incident", details: err.message });
  }
});

/* ----------------- GET INCIDENTS (ADMIN OR USER) ------------------ */
router.get("/", authMiddleware, async (req, res) => {
  try {
    if (req.user.isAdmin) {
      const all = await Incident.find().sort({ createdAt: -1 });
      return res.json(all);
    }

    const incidents = await Incident.find({
      $or: [{ status: "approved" }, { userId: req.user.id }],
    }).sort({ createdAt: -1 });

    res.json(incidents);
  } catch (_err) {
    res.status(500).json({ message: "Error fetching incidents" });
  }
});

/* ---------------- PUBLIC INCIDENTS ---------------- */
router.get("/public", async (req, res) => {
  try {
    const list = await Incident.find({ status: "approved" }).sort({
      createdAt: -1,
    });
    res.json(list);
  } catch (_err) {
    res.status(500).json({ message: "Error loading public incidents" });
  }
});

/* --------- HOMEPAGE LATEST INCIDENTS ----------- */
router.get("/latest", async (req, res) => {
  try {
    const items = await Incident.find({ status: "approved" })
      .sort({ createdAt: -1 })
      .limit(3);

    res.json(items);
  } catch (_err) {
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
  } catch (_err) {
    res.status(500).json({ message: "Error fetching heatmap coords" });
  }
});


/* --------- BULK UPDATE STATUS (ADMIN ONLY) ---------- */
router.patch("/bulk-status", authMiddleware, requireAdminOnly, async (req, res) => {
  try {
    const { ids, status } = req.body;
    if (!Array.isArray(ids) || !status) {
      return res.status(400).json({ message: "Invalid request data" });
    }

    const updated = await Incident.updateMany(
      { _id: { $in: ids } },
      { status: status }
    );

    await logAudit(req, `Bulk updated ${updated.modifiedCount} incidents to ${status}`, "system", null, ids.join(", "));
    res.json({ message: `Bulk updated ${updated.modifiedCount} incidents` });
  } catch (_err) {
    res.status(500).json({ message: "Error in bulk update" });
  }
});

/* --------- UPDATE STATUS (ADMIN ONLY) ---------- */
router.patch("/:id/status", authMiddleware, requireAdminOnly, async (req, res) => {
  try {
    const updated = await Incident.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );

    if (!updated)
      return res.status(404).json({ message: "Incident not found" });

    await logAudit(req, `Changed status to ${req.body.status}`, "incident", req.params.id);
    res.json(updated);
  } catch (_err) {
    res.status(500).json({ message: "Error updating status" });
  }
});

/* ---------------- DELETE INCIDENT ---------------- */
router.delete("/:id", authMiddleware, requireAdminOnly, async (req, res) => {
  try {
    const deleted = await Incident.findByIdAndDelete(req.params.id);
    if (deleted) {
      await logAudit(req, "Deleted incident", "incident", req.params.id, deleted.title);
    }
    res.json({ message: "Deleted successfully" });
  } catch (_err) {
    res.status(500).json({ message: "Error deleting incident" });
  }
});

/* ---------------- PUBLIC HOMEPAGE STATS ---------------- */
router.get("/stats/public", async (req, res) => {
  try {
    const total = await Incident.countDocuments();
    const active = await Incident.countDocuments({ status: "pending" });
    const approved = await Incident.countDocuments({ status: "approved" });

    res.json({ total, active, approved });
  } catch (_err) {
    res.status(500).json({ message: "Error loading stats" });
  }
});

export default router;
