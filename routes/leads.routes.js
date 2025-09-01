

// import express from "express";
// import indexControllers from "../controllers/index.controllers.js";

// const router = express.Router();

// router.post("/create", indexControllers.leadsController.createLead);
// router.get("/getAllLead", indexControllers.leadsController.getLeads);
// router.get("/getLead/:id", indexControllers.leadsController.getLeadById);
// router.put("/updateLead/:id", indexControllers.leadsController.updateLead);
// router.delete("/deleteLead/:id", indexControllers.leadsController.deleteLead);

// // Optional: update only follow up date
// router.patch(
//   "/:id/followup",
//   indexControllers.leadsController.updateFollowUpDate
// );

// router.patch("/:id/convert", indexControllers.leadsController.convertLeadToDeal);


// // Extra
// router.get("/recent", indexControllers.leadsController.getRecentLeads);
// router.get("/pending", indexControllers.leadsController.getPendingLeads);
// export default router;



import express from "express";
import indexControllers from "../controllers/index.controllers.js";

import upload from "../middlewares/upload.js";


const router = express.Router();

// Lead create route with multiple files upload
router.post(
  "/create",
  upload.array("attachments", 10), // max 10 files, field name 'attachments'
  indexControllers.leadsController.createLead
);

router.get("/getAllLead", indexControllers.leadsController.getLeads);
router.get("/getLead/:id", indexControllers.leadsController.getLeadById);
router.put("/updateLead/:id", indexControllers.leadsController.updateLead);
router.delete("/deleteLead/:id", indexControllers.leadsController.deleteLead);

router.patch("/:id/followup", indexControllers.leadsController.updateFollowUpDate);
router.patch("/:id/convert", indexControllers.leadsController.convertLeadToDeal);
router.get("/recent", indexControllers.leadsController.getRecentLeads);
router.get("/pending", indexControllers.leadsController.getPendingLeads);

export default router;//original



