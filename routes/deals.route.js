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

// Get all deals - accessible to all authenticated users but filtered by role
router.get("/getAll", indexControllers.dealsController.getAllDeals);

// Get deal by ID - accessible to admin or assigned user
router.get(
  "/getAll/:id",
  adminOrAssignedToDeal,
  indexControllers.dealsController.getDealById
);

// Update deal stage - only admin or assigned user can update
router.patch(
  "/:id/stage",
  adminOrAssignedToDeal,
  indexControllers.dealsController.updateStage
);

// Create manual deal - only admin can create manual deals
//router.post("/createManual", adminOnly, indexControllers.dealsController.createManualDeal);

router.post(
  "/createManual",
  adminOnly,
  upload.array("attachments", 10), // multer middleware
  indexControllers.dealsController.createManualDeal
);

// Update deal (assignTo, stage, value, notes) - only admin or assigned user can update
router.patch(
  "/update-deal/:id",
  adminOrAssignedToDeal,
  upload.array("attachments"),
  indexControllers.dealsController.updateDeal
);

// Delete deal - only admin or assigned user can delete
router.delete(
  "/delete-deal/:id",
  adminOrAssignedToDeal,
  indexControllers.dealsController.deleteDeal
);
router.get("/pending", indexControllers.dealsController.pendingDeals);

export default router;
