import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import indexControllers from "../controllers/index.controllers.js";
const router = express.Router();
router.use(protect);
router.post("/command", indexControllers.botController.parseCallCommand);
router.get("/suggestions", indexControllers.botController.getSuggestions);
export default router;