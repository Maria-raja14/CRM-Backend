

import express from "express";
import indexControllers from "../controllers/index.controllers.js";
import {
  protect,
  adminOrAssigned,
  adminOnly,
  adminOrSales,
} from "../middlewares/auth.middleware.js";
import upload from "../middlewares/upload.js"; // ✅ Now supports all file types

const router = express.Router();

// Apply protect middleware to all routes
router.use(protect);

// ─────────────────────────────────────────────
// Lead CRUD
// ─────────────────────────────────────────────

// Create lead — admin or sales only, up to 5 attachments
router.post(
  "/create",
  adminOrSales,
  upload.array("attachments", 5),
  indexControllers.leadsController.createLead
);

router.get("/getAllLead", indexControllers.leadsController.getLeads);

router.get(
  "/getLead/:id",
  adminOrAssigned,
  indexControllers.leadsController.getLeadById
);

// Update lead — adminOrAssigned check BEFORE upload to avoid unnecessary processing
router.put(
  "/updateLead/:id",
  adminOrAssigned,
  upload.array("attachments", 5),
  indexControllers.leadsController.updateLead
);

router.delete(
  "/deleteLead/:id",
  adminOrAssigned,
  indexControllers.leadsController.deleteLead
);

// ─────────────────────────────────────────────
// Lead actions
// ─────────────────────────────────────────────

router.patch(
  "/:id/followup",
  protect,
  indexControllers.leadsController.updateFollowUpDate
);

router.patch(
  "/:id/convert",
  adminOrAssigned,
  indexControllers.leadsController.convertLeadToDeal
);

router.patch(
  "/:id/status",
  adminOrAssigned,
  indexControllers.leadsController.updateLeadStatus
);

// ─────────────────────────────────────────────
// Dashboard helpers
// ─────────────────────────────────────────────
router.get("/recent", indexControllers.leadsController.getRecentLeads);
router.get("/pending", indexControllers.leadsController.getPendingLeads);

export default router;