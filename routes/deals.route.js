import express from "express";
import indexControllers from "../controllers/index.controllers.js";
import {
  protect,
  adminOnly,
  adminOrAssignedToDeal,
} from "../middlewares/auth.middleware.js";
import upload from "../middlewares/upload.js";

const router = express.Router();

// All routes are protected
router.use(protect);

// Convert lead → deal
router.post(
  "/fromLead/:leadId",
  indexControllers.dealsController.createDealFromLead
);

// Get all deals
router.get("/getAll", indexControllers.dealsController.getAllDeals);

// Get deal by ID
router.get(
  "/getAll/:id",
  adminOrAssignedToDeal,
  indexControllers.dealsController.getDealById
);

// Update deal stage
router.patch(
  "/:id/stage",
  adminOrAssignedToDeal,
  indexControllers.dealsController.updateStage
);

// Create manual deal
router.post(
  "/createManual",
  adminOnly,
  upload.array("attachments", 10),
  indexControllers.dealsController.createManualDeal
);

// Update deal
router.patch(
  "/update-deal/:id",
  adminOrAssignedToDeal,
  upload.array("attachments"),
  indexControllers.dealsController.updateDeal
);

// Complete follow-up
router.post(
  "/:id/complete-followup",
  adminOrAssignedToDeal,
  indexControllers.dealsController.completeFollowUp
);

// Delete deal
router.delete(
  "/delete-deal/:id",
  adminOrAssignedToDeal,
  indexControllers.dealsController.deleteDeal
);

router.get("/pending", indexControllers.dealsController.pendingDeals);

export default router;