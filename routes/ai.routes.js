import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import aiController from "../controllers/ai.controller.js";
const router = express.Router();
router.get("/chat", protect, aiController);
router.post("/chat", protect, aiController);
export default router;

