// import express from "express";
// import indexControllers from "../controllers/index.controllers.js";

// const router = express.Router();

// router.post("/create", indexControllers.leadsController.createLead);
// router.get("/getLead", indexControllers.leadsController.getLeads);
// router.get("getAllLead/:id", indexControllers.leadsController.getLeadById);
// router.put("updateLead/:id", indexControllers.leadsController.updateLead);
// router.delete("deleteLead/:id", indexControllers.leadsController.deleteLead);

// export default router;


import express from "express";
import indexControllers from "../controllers/index.controllers.js";

const router = express.Router();

router.post("/create", indexControllers.leadsController.createLead);
router.get("/getLead", indexControllers.leadsController.getLeads);
router.get("/getAllLead/:id", indexControllers.leadsController.getLeadById);
router.put("/updateLead/:id", indexControllers.leadsController.updateLead);
router.delete("/deleteLead/:id", indexControllers.leadsController.deleteLead);

export default router;
