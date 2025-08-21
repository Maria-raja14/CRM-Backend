import express from "express";
import indexControllers from "../controllers/index.controllers.js";

const router = express.Router();

// Convert lead → deal
router.post("/fromLead/:leadId", indexControllers.dealsController.createDealFromLead);

// Get all deals
router.get("/getAll", indexControllers.dealsController.getAllDeals);

// Update deal stage
router.patch("/:id/stage", indexControllers.dealsController.updateStage);

router.post("/createManual", indexControllers.dealsController.createManualDeal);

// Update deal (assignTo, stage, value, notes)
router.patch("/:id", indexControllers.dealsController.updateDeal);


export default router;
