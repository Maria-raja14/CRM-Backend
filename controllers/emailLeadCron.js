// controllers/emailLeadCron.js
//
// Polls TripMagics Gmail inbox every 5 minutes for new lead emails.
// Started from server.js alongside the existing follow-up crons.

import cron from "node-cron";
import { pollTripMagicsEmails } from "./emailLead.controller.js";

export function startEmailLeadCron() {
  // Run every 5 minutes: "*/5 * * * *"
  // Change to "*/2 * * * *" for every 2 min, or "* * * * *" for every minute
  cron.schedule("*/5 * * * *", async () => {
    console.log("⏰ [emailLeadCron] Polling TripMagics emails...");
    try {
      await pollTripMagicsEmails();
    } catch (err) {
      console.error("❌ [emailLeadCron] Error:", err.message);
    }
  });

  console.log("✅ [emailLeadCron] Started — polling every 5 minutes");
}