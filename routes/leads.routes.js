

import express from "express";
import indexControllers from "../controllers/index.controllers.js";
;

const router = express.Router();

router.post("/create", indexControllers.leadsController.createLead);
router.get("/getAllLead", indexControllers.leadsController.getLeads);
router.get("/getLead/:id", indexControllers.leadsController.getLeadById);
router.put("/updateLead/:id", indexControllers.leadsController.updateLead);
router.delete("/deleteLead/:id", indexControllers.leadsController.deleteLead);

// Optional: update only follow up date
router.patch(
  "/:id/followup",
  indexControllers.leadsController.updateFollowUpDate
);

router.patch("/:id/convert", indexControllers.leadsController.convertLeadToDeal);

export default router;//original



