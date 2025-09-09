


import cron from "node-cron";
import Lead from "../models/leads.model.js";
import User from "../models/user.model.js";
import Role from "../models/role.model.js";
import Notification from "../models/notification.model.js";
import moment from "moment"; // ✅ keep only moment
import { sendNotification } from "../services/notificationService.js";


// Avoid duplicate reminders within the same gap (in minutes)
const SHOULD_REMIND_EVERY_MINUTES = 120;

// ✅ Get Admin UserIds
const getAdminUserIds = async () => {
  const adminRole = await Role.findOne({ name: "Admin" });
  if (!adminRole) {
    console.log("⚠️ No Admin role found in DB");
    return [];
  }

  const admins = await User.find({ role: adminRole._id }, "_id");
  return admins.map((a) => a._id.toString());
};

// ---------- Follow-Up Cron (every minute) ----------
export function startFollowUpCron() {
  cron.schedule("* * * * *", async () => {
    const nowUtc = moment.utc();
    console.log("🕒 Follow-up Cron:", nowUtc.format("YYYY-MM-DD HH:mm:ss"));

    try {
      const dueLeads = await Lead.find({
        followUpDate: { $lte: nowUtc.toDate() },
        status: { $in: ["Hot", "Warm", "Cold"] },
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
      }).populate("assignTo", "firstName lastName email _id");

      // console.log("📋 Due leads found:", dueLeads.length);
      if (!dueLeads.length) return;

      for (const lead of dueLeads) {
        const assignUserId = lead.assignTo?._id?.toString();

        // Notify assigned user
        if (assignUserId) {
          await sendNotification(
            assignUserId,
            `⚠️ You missed a follow-up for Lead: ${lead.leadName || "Unnamed Lead"}`,
            "followup",
            { leadId: lead._id.toString() }
          );
        }

        // Notify Admins
        const admins = await getAdminUserIds();
        for (const adminId of admins) {
          await sendNotification(
            adminId,
            `Salesman ${lead.assignTo?.firstName || "Unknown"} missed follow-up for Lead: ${lead.leadName}`,
            "followup",
            {
              leadId: lead._id.toString(),
              salesman: lead.assignTo?.firstName || "Unknown",
            }
          );
        }

        // ✅ mark reminder as sent
        lead.lastReminderAt = new Date();
        await lead.save();
      }
    } catch (err) {
      console.error("❌ followUp cron error:", err);
    }
  });

  // ---------- Cleanup Expired Notifications Cron (every hour) ----------
  cron.schedule("0 * * * *", async () => {
    try {
      const now = new Date();
      const deleted = await Notification.deleteMany({ expiresAt: { $lte: now } });
      console.log("🗑️ Deleted expired notifications:", deleted.deletedCount);
    } catch (err) {
      console.error("❌ Error deleting expired notifications:", err);
    }
  });
}
