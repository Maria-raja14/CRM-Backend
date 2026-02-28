


import express from "express";
import { protect, adminOrSales } from "../middlewares/auth.middleware.js";
import salesReportsController from "../controllers/salesReports.controller.js";

const router = express.Router();

// @route   GET /api/sales/performance
// @desc    Get performance metrics for a salesperson (by userId query)
// @access  Private (Admin or Sales)
router.get(
  "/performance",
  protect,
  adminOrSales,
  salesReportsController.getSalesPerformance
);

export default router;