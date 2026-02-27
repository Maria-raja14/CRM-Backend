import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import {
  calculateClientCLV,
  calculateAllCLV,
  getCLVDashboard,
  getClientCLV,
  createSupportTicket,
  createRenewal,
  getWonDeals,
  createClientReview,
  getPricingRisks,
  resolvePricingRisk,
  getPricingRecommendation
} from "../controllers/clientLTVController.js";

const router = express.Router();
router.use(protect);

// Dashboard
router.get("/dashboard", getCLVDashboard);

// Won deals for client review
router.get("/won-deals", getWonDeals);

// Client reviews
router.post("/client-review", createClientReview);

// Client details
router.get("/client/:companyName", getClientCLV);

// CLV calculations
router.post("/calculate-all", calculateAllCLV);
router.post("/calculate/:companyName", calculateClientCLV);

// Support tickets
router.post("/tickets", createSupportTicket);

// Renewals
router.post("/renewals", createRenewal);

// Pricing risks
router.get("/pricing-risks", getPricingRisks);
router.patch("/pricing-risks/:id/resolve", resolvePricingRisk);

// Pricing recommendation
router.get("/pricing-recommendation/:companyId", getPricingRecommendation);

export default router;