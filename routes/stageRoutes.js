// routes/stageRoutes.js
import express from "express";
import indexControllers from "../controllers/index.controllers.js";
const router = express.Router();

router.get("/",indexControllers.stageController.getAllStages);
// router.post("/create",indexControllers.stageController.createStage);
router.put("/move",indexControllers. stageController.moveProposal);

export default router;
