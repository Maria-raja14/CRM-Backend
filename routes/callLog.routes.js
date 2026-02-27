import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import {
  createCallLog,
  getCallLogs,
  getCallLogById,
  updateCallLog,
  getCallStats,
  trackCallStart,
  trackCallEnd,
  trackHeartbeat
} from "../controllers/callLog.controller.js";
const router = express.Router();
//  PUBLIC TRACKING ENDPOINTS (no auth required for webhooks)
router.get("/track/:sessionId/start", trackCallStart);
router.get("/track/:sessionId/end", trackCallEnd);
router.post("/track/:sessionId/heartbeat", trackHeartbeat);
//  PROTECTED ROUTES
router.use(protect);
router.post("/", createCallLog);
router.get("/", getCallLogs);
router.get("/stats", getCallStats);
router.get("/:id", getCallLogById);
router.patch("/:id", updateCallLog);
export default router;