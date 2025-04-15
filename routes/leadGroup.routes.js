import express from 'express'
import indexControllers from '../controllers/index.controllers.js';




const router=express.Router();

router.post("/add", indexControllers.LeadGroupController.addLeadGroup);
router.get("/",indexControllers.LeadGroupController.getLeadGroups);
router.put("/:id",indexControllers.LeadGroupController.editLeadGroup);
router.delete("/:id",indexControllers.LeadGroupController.deleteLeadGroup);

export default router;