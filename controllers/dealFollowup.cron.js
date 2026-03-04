// controllers/dealFollowUp.cron.js
import cron from "node-cron";
import moment from "moment";
import { checkFollowUpsAndNotify } from "../services/notificationService.js";

export function startDealFollowUpCron() {
  // Run every hour at minute 0 (e.g., 1:00, 2:00, etc.)
  cron.schedule("0 * * * *", async () => {
    console.log("🕒 Deal Follow-up Cron Check:", moment().format("YYYY-MM-DD HH:mm:ss"));
    
    try {
      const notifiedCount = await checkFollowUpsAndNotify();
      if (notifiedCount > 0) {
        console.log(`✅ Sent ${notifiedCount} follow-up notifications for deals`);
      }
    } catch (error) {
      console.error("❌ Deal follow-up cron error:", error);
    }
  });

  console.log("✅ Deal follow-up cron job scheduled");
}