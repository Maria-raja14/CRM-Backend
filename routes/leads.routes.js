// import express from "express";
// import indexControllers from "../controllers/index.controllers.js";

// import upload from "../middlewares/upload.js";


// const router = express.Router();

// // Lead create route with multiple files upload
// router.post(
//   "/create",
//   upload.array("attachments", 10), // max 10 files, field name 'attachments'
//   indexControllers.leadsController.createLead
// );

// router.get("/getAllLead", indexControllers.leadsController.getLeads);
// router.get("/getLead/:id", indexControllers.leadsController.getLeadById);
// router.put("/updateLead/:id", indexControllers.leadsController.updateLead);
// router.delete("/deleteLead/:id", indexControllers.leadsController.deleteLead);

// router.patch("/:id/followup", indexControllers.leadsController.updateFollowUpDate);
// router.patch("/:id/convert", indexControllers.leadsController.convertLeadToDeal);
// router.get("/recent", indexControllers.leadsController.getRecentLeads);
// router.get("/pending", indexControllers.leadsController.getPendingLeads);

// export default router;//original



import express from "express";
import indexControllers from "../controllers/index.controllers.js";
import { protect, adminOrAssigned, adminOnly, adminOrSales } from "../middlewares/auth.middleware.js";
import upload from "../middlewares/upload.js";

const router = express.Router();

// Apply protect middleware to all routes
router.use(protect);

// Lead create route with multiple files upload
router.post(
  "/create",
  adminOrSales, // Only admin or sales can create leads
  upload.array("attachments", 5), // max 10 files, field name 'attachments'
  indexControllers.leadsController.createLead
);

router.get("/getAllLead", indexControllers.leadsController.getLeads);
router.get("/getLead/:id", adminOrAssigned, indexControllers.leadsController.getLeadById);
router.put("/updateLead/:id", upload.array("attachments", 5), adminOrAssigned, indexControllers.leadsController.updateLead);
router.delete("/deleteLead/:id", adminOrAssigned, indexControllers.leadsController.deleteLead);

router.patch("/:id/followup", adminOrAssigned, indexControllers.leadsController.updateFollowUpDate);
router.patch("/:id/convert", adminOrAssigned, indexControllers.leadsController.convertLeadToDeal);
router.get("/recent", indexControllers.leadsController.getRecentLeads);
router.get("/pending", indexControllers.leadsController.getPendingLeads);

export default router;

