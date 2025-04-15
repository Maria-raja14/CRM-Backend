import express from "express";
import { createDeal, getAllDeals,getDealById } from "../controllers/dealController.js";

const router = express.Router();

router.post("/createdeal", createDeal);
router.get("/getAlldeal", getAllDeals);
router.get("/getDealById/:id", getDealById);

export default router;
