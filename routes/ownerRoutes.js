import express from "express";
import { createOwner, getAllOwners,getOwnerById } from "../controllers/ownerController.js";

const router = express.Router();

router.post("/createOwner", createOwner);
router.get("/getOwner", getAllOwners);
router.get("/single/:id", getOwnerById); 


export default router;
