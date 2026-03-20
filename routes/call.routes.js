// routes/call.routes.js
import express from "express";
import {
  inboundCallWebhook,
  callStatusCallback,
  recordingCallback,
  makeOutboundCall,
  outboundTwiml,
  getAllCalls,
  getCallById,
  updateCall,
  deleteCall,
  getCallStats,
} from "../controllers/call.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

// ── Twilio Webhooks (NO auth — Twilio calls these directly) ──────────────────
// ✅ CONFIGURE THESE IN TWILIO CONSOLE:
//
//  1. Inbound call webhook:
//     Twilio Console → Phone Numbers → Manage → Active Numbers
//     → click your number (+13049443661)
//     → Voice & Fax section:
//         "A Call Comes In" → Webhook → POST
//         URL: https://yourdomain.com/api/call/webhook
//
//  2. Status callback:
//     Same page → "Call Status Changes" → POST
//     URL: https://yourdomain.com/api/call/status
//
//  3. Recording callback (auto-set by outbound call code):
//     https://yourdomain.com/api/call/recording-callback
//
router.post("/webhook",              inboundCallWebhook);   // ← CONFIGURE THIS IN TWILIO
router.post("/status",               callStatusCallback);   // ← CONFIGURE THIS IN TWILIO
router.post("/recording-callback",   recordingCallback);
router.get("/outbound-twiml",        outboundTwiml);        // TwiML for outbound calls

// ── Protected CRM API routes ─────────────────────────────────────────────────
router.get("/stats",       protect, getCallStats);
router.get("/all",         protect, getAllCalls);
router.get("/:id",         protect, getCallById);
router.post("/outbound",   protect, makeOutboundCall);
router.patch("/:id",       protect, updateCall);
router.delete("/:id",      protect, deleteCall);

export default router;