// controllers/dealFollowup.cron.js
import cron from "node-cron";
import Deal from "../models/deals.model.js";
import User from "../models/user.model.js";
import Role from "../models/role.model.js";
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
      const dueDeals = await Deal.find({
        followUpDate: { $lte: nowUtc.toDate() },
        stage: { $nin: ["Closed Won", "Closed Lost"] },
        $or: [
          { lastReminderAt: { $exists: false } },
          { lastReminderAt: null },
          {
            lastReminderAt: {
              $lt: nowUtc
                .clone()
                .subtract(SHOULD_REMIND_EVERY_MINUTES, "minute")
                .toDate(),
            },
          },
        ],
      }).populate("assignedTo", "firstName lastName email _id profileImage");

      if (!dueDeals.length) {
        console.log("📊 No due deals found");
        return;
      }

      console.log(`📊 Found ${dueDeals.length} due deals`);
      const admins = await getAdminUserIds();

      for (const deal of dueDeals) {
        const assignUserId = deal.assignedTo?._id?.toString();
        const salesmanName = deal.assignedTo ? 
          `${deal.assignedTo.firstName || ''} ${deal.assignedTo.lastName || ''}`.trim() : 
          'Unassigned';

        console.log(`Processing deal: ${deal.dealName}, Assigned to: ${salesmanName}`);

        if (assignUserId) {
          await sendNotification(
            assignUserId,
            `Follow-up due for deal: ${deal.dealName}`,
            "followup",
            { 
              dealId: deal._id.toString(),
              dealName: deal.dealName,
              salesmanName: salesmanName,
              profileImage: deal.assignedTo?.profileImage
            }
          );
        }

        for (const adminId of admins) {
          await sendNotification(
            adminId,
            `Deal follow-up due: ${deal.dealName} (Assigned to: ${salesmanName})`,
            "admin",
            {
              dealId: deal._id.toString(),
              dealName: deal.dealName,
              salesmanName: salesmanName,
              salesmanId: assignUserId,
            }
          );
        }

        deal.lastReminderAt = new Date();
        await deal.save();
        console.log(`✅ Updated lastReminderAt for deal: ${deal.dealName}`);
      }
    } catch (err) {
      console.error("❌ Deal followUp cron error:", err);
    }
  });
}
}