import express from "express";
import {
  getLeaderboard,
  getUserStreak,
  updateStreakFromLogin as updateStreak,
  getSalesUsers, getUserLoginHistory
} from "../controllers/streak.controller.js";
import { protect, adminOrSales } from "../middlewares/auth.middleware.js";
const router = express.Router();
// All routes are protected
router.use(protect);
// Get leaderboard - accessible by all authenticated users
router.get("/leaderboard", getLeaderboard);
// Get specific user streak
router.get("/user/:userId", getUserStreak);
// Update streak (call this on login/activity)
router.post("/update/:userId", updateStreak);
// Get sales users - using adminOrSales middleware
router.get("/sales-users", adminOrSales, getSalesUsers);
// Get user login history for streaks (last 30 days)
router.get('/login-history/:userId', getUserLoginHistory);
export default router;