import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { parseCallCommand, getSuggestions } from "../controllers/bot.controller.js";
const router = express.Router();
router.use(protect);
router.post("/command", parseCallCommand);
router.get("/suggestions", getSuggestions);
export default router;