import express from "express";
import streakController from "../controllers/streak.controller.js";
import { protect, adminOnly } from "../middlewares/auth.middleware.js";

const router = express.Router();

// --------------------
// Protected routes
// --------------------

// Update streak on login (user must be logged in)
router.post("/update/:userId", protect, streakController.updateStreakFromLogin);

// Get user login history (user must be logged in)
router.get("/login-history/:userId", protect, streakController.getUserLoginHistory);

// Get individual user streak (user must be logged in)
router.get("/user/:userId", protect, streakController.getUserStreak);

// --------------------
// Admin-only routes
// --------------------

// Get leaderboard (admin only)
router.get("/leaderboard", protect, adminOnly, streakController.getLeaderboard);

// Get sales users (admin only)
router.get("/sales-users", protect, adminOnly, streakController.getSalesUsers);

export default router;