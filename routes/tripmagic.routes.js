// routes/tripmagic.routes.js
// Admin-only endpoints to manage / monitor the TripMagics email poller

import express from "express";
import { protect, adminOnly } from "../middlewares/auth.middleware.js";
import { triggerTripMagicPoll } from "../services/tripmagicPoller.service.js";
import TripmagicLog from "../models/tripmagicLog.model.js";

const router = express.Router();

router.use(protect);

/**
 * POST /api/tripmagic/poll
 * Manually trigger a poll right now (Admin only)
 */
router.post("/poll", adminOnly, async (req, res) => {
  try {
    console.log(`🔧 [TripMagic] Manual poll triggered by admin ${req.user._id}`);
    // Run in background — don't await so HTTP responds immediately
    triggerTripMagicPoll().catch((err) =>
      console.error("❌ [TripMagic] Manual poll error:", err.message)
    );
    res.json({ success: true, message: "TripMagics poll triggered. New leads will appear shortly." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/tripmagic/logs
 * Get recent processing logs (Admin only)
 */
router.get("/logs", adminOnly, async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      TripmagicLog.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("leadId", "leadName phoneNumber status")
        .lean(),
      TripmagicLog.countDocuments(),
    ]);

    res.json({
      success: true,
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/tripmagic/stats
 * Quick stats (Admin only)
 */
router.get("/stats", adminOnly, async (req, res) => {
  try {
    const [total, processed, failed, skipped] = await Promise.all([
      TripmagicLog.countDocuments(),
      TripmagicLog.countDocuments({ status: "processed" }),
      TripmagicLog.countDocuments({ status: "failed" }),
      TripmagicLog.countDocuments({ status: "skipped" }),
    ]);

    const last = await TripmagicLog.findOne().sort({ createdAt: -1 }).lean();

    res.json({
      success: true,
      stats: {
        total,
        processed,
        failed,
        skipped,
        lastProcessedAt: last?.createdAt || null,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;