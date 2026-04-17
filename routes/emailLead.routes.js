// routes/emailLead.routes.js

import express from "express";
import { protect, adminOrSales, adminOnly } from "../middlewares/auth.middleware.js";
import emailLeadController from "../controllers/emailLead.controller.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// ─── Poll trigger (Admin only) ────────────────────────────────────────────────
// POST /api/email-leads/poll
router.post("/poll", adminOnly, emailLeadController.triggerPoll);

// ─── List email leads ─────────────────────────────────────────────────────────
// GET /api/email-leads
router.get("/", emailLeadController.getEmailLeads);

// ─── Single email lead ────────────────────────────────────────────────────────
// GET /api/email-leads/:id
router.get("/:id", emailLeadController.getEmailLeadById);

// ─── Update status ────────────────────────────────────────────────────────────
// PATCH /api/email-leads/:id/status
router.patch("/:id/status", emailLeadController.updateStatus);

// ─── Update follow-up date ────────────────────────────────────────────────────
// PATCH /api/email-leads/:id/followup
router.patch("/:id/followup", emailLeadController.updateFollowUp);

// ─── Delete ───────────────────────────────────────────────────────────────────
// DELETE /api/email-leads/:id
router.delete("/:id", emailLeadController.deleteEmailLead);

export default router;//old code..