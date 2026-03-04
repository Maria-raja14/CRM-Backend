import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import indexControllers from "../controllers/index.controllers.js";
const router = express.Router();
//  PUBLIC TRACKING ENDPOINTS (no auth required for webhooks)
router.get("/track/:sessionId/start", indexControllers.callLogController.trackCallStart);
router.get("/track/:sessionId/end", indexControllers.callLogController.trackCallEnd);
router.post("/track/:sessionId/heartbeat", indexControllers.callLogController.trackHeartbeat);
//  PROTECTED ROUTES
router.use(protect);
router.post("/", indexControllers.callLogController.createCallLog);
router.get("/", indexControllers.callLogController.getCallLogs);
router.get("/stats", indexControllers.callLogController.getCallStats);
router.get("/:id", indexControllers.callLogController.getCallLogById);
router.patch("/:id", indexControllers.callLogController.updateCallLog);
export default router;