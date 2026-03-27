


// // routes/facebooklead.routes.js
// import express from "express";
// import {
//   verifyWebhook,
//   receiveWebhook,
//   getAllFacebookLeads,
// } from "../controllers/facebooklead.controller.js";

// const router = express.Router();

// // ── Webhook verification (Facebook sends GET to verify) ────────────────────
// // Callback URL to set in Facebook App Dashboard:
// //   https://yourdomain.com/api/facebook-leads/webhook
// router.get("/webhook", verifyWebhook);

// // ── Webhook receiver (Facebook sends POST with lead data) ──────────────────
// router.post("/webhook", receiveWebhook);

// // ── Admin: list all raw Facebook leads ────────────────────────────────────
// router.get("/", getAllFacebookLeads);

// export default router;