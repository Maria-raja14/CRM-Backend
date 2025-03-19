import express from 'express'
import { addLeadGroup, deleteLeadGroup, editLeadGroup, getLeadGroups } from '../controllers/leadGroup.controller.js';


const router=express.Router();

router.post("/add", addLeadGroup);
router.get("/",getLeadGroups);
router.put("/:id",editLeadGroup);
router.delete("/:id",deleteLeadGroup);

export default router;