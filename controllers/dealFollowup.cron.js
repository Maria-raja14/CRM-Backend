// controllers/dealFollowUp.cron.js
import cron from "node-cron";
import moment from "moment";
import { sendNotification } from "../services/notificationService.js";

const SHOULD_REMIND_EVERY_MINUTES = 1440; // 24 hours
export default{

getAdminUserIds : async () => {
  const adminRole = await Role.findOne({ name: "Admin" });
  if (!adminRole) return [];
  const admins = await User.find({ role: adminRole._id }, "_id");
  return admins.map((a) => a._id.toString());
},
startDealFollowUpCron() {
  cron.schedule("* * * * *", async () => {
    const nowUtc = moment.utc();
    console.log("📊 Deal Follow-up Cron Running:", nowUtc.format("YYYY-MM-DD HH:mm:ss"));

    try {
      const notifiedCount = await checkFollowUpsAndNotify();
      if (notifiedCount > 0) {
        console.log(`✅ Sent ${notifiedCount} follow-up notifications for deals`);
      }
    } catch (error) {
      console.error("❌ Deal follow-up cron error:", error);
    }
  });
}
}