// // routes/facebooklead.routes.js
// import express from "express";
// import {
//   verifyWebhook,
//   receiveLeadWebhook,
//   getAllFacebookLeads,
//   updateFacebookLeadStatus,
//   updateFacebookLeadFollowUp,
//   deleteFacebookLead,
//   manualFetch,
// } from "../controllers/facebooklead.controller.js";

// const router = express.Router();

// // ─── Webhook (public — Facebook calls these, no auth) ─────────────────────────
// // Facebook Dashboard → Callback URL: https://uenjoytours.cloud/api/webhook
// router.get("/",  verifyWebhook);      // GET  /api/webhook  ← verification
// router.post("/", receiveLeadWebhook); // POST /api/webhook  ← new lead events

// // ─── CRM API (your frontend calls these) ─────────────────────────────────────
// // GET    /api/facebook-leads               list all (paginated, search, filter)
// // GET    /api/facebook-leads/fetch/:id     re-fetch one lead from Graph API
// // PATCH  /api/facebook-leads/:id/status    update status
// // PATCH  /api/facebook-leads/:id/followup  update follow-up date
// // DELETE /api/facebook-leads/:id           delete

// export const facebookWebhookRouter = router; // mounted at /api/webhook

// const leadRouter = express.Router();
// leadRouter.get("/",                     getAllFacebookLeads);
// leadRouter.get("/fetch/:leadgenId",     manualFetch);
// leadRouter.patch("/:id/status",         updateFacebookLeadStatus);
// leadRouter.patch("/:id/followup",       updateFacebookLeadFollowUp);
// leadRouter.delete("/:id",              deleteFacebookLead);

// export default leadRouter; // mounted at /api/facebook-leads


// routes/facebooklead.routes.js
import express from "express";
import {
  verifyWebhook,
  receiveWebhook,
  getAllFacebookLeads,
} from "../controllers/facebooklead.controller.js";

const router = express.Router();

// ── Webhook verification (Facebook sends GET to verify) ────────────────────
// Callback URL to set in Facebook App Dashboard:
//   https://yourdomain.com/api/facebook-leads/webhook
router.get("/webhook", verifyWebhook);

// ── Webhook receiver (Facebook sends POST with lead data) ──────────────────
router.post("/webhook", receiveWebhook);

// ── Admin: list all raw Facebook leads ────────────────────────────────────
router.get("/", getAllFacebookLeads);

export default router;