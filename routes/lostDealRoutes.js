// backend/routes/lostDealRoutes.js
import express from "express";
import { 
  saveLostDealReason,
  getLostDealReasons 
} from "../controllers/lostDealController.js";
import { 
  getLostDealAnalytics, 
  exportLostDealReport 
} from "../controllers/lostDealAnalytics.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

// POST /api/deals/lost-reason - Save loss reason for a deal
router.post("/lost-reason", protect, saveLostDealReason);

// GET /api/deals/lost-reasons - Get all loss reasons
router.get("/lost-reasons", protect, getLostDealReasons);

// GET /api/deals/analytics/lost - Get lost deal analytics
router.get("/analytics/lost", protect, getLostDealAnalytics);

// GET /api/deals/analytics/lost/export - Export lost deal report
router.get("/analytics/lost/export", protect, exportLostDealReport);

export default router;