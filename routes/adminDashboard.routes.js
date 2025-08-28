import express from "express";
import indexControllers from "../controllers/index.controllers.js";

const router = express.Router();

router.get("/summary", indexControllers.adminDashboardController.getDashboardSummary);
router.get("/pipeline", indexControllers.adminDashboardController.getPipeline);

export default router;
