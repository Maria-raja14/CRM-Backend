import cron from "node-cron";
import dayjs from "dayjs";
import Lead from "../models/leads.model.js";

import sendEmail from "../services/email.js";
import { notifyUser, notifyAdmins } from "../realtime/socket.js";
import Role from "../models/role.model.js";

// Avoid duplicate reminders within the same gap
const SHOULD_REMIND_EVERY_MINUTES = 60;

// Example: Get admin userIds (replace with DB fetch later)
const getAdminUserIds = async () => {
  // 1. Admin role id eduthukkara
  const adminRole = await Role.findOne({ name: "Admin" });
  if (!adminRole) return [];

  // 2. User la roleId = adminRole._id filter panna
  const admins = await User.find({ role: adminRole._id }, "_id");
  return admins.map((a) => a._id.toString());
};

export function startFollowUpCron() {
  // Runs every minute (testing). For prod: "0 9 * * *"
  cron.schedule("* * * * *", async () => {
    const now = dayjs();
    console.log("🕒 Follow-up Cron:", now.format("YYYY-MM-DD HH:mm:ss"));

    try {
      // Fetch due or overdue leads
      const dueLeads = await Lead.find({
        followUpDate: { $lte: now.toDate() },
        status: { $in: ["Hot", "Warm", "Cold"] },
        $or: [
          { lastReminderAt: { $exists: false } },
          {
            lastReminderAt: {
              $lt: now.subtract(SHOULD_REMIND_EVERY_MINUTES, "minute").toDate(),
            },
          },
        ],
      }).populate("assignTo", "firstName lastName email _id");

      if (!dueLeads.length) return;

      // Loop through each missed lead
      for (const lead of dueLeads) {
        const assignUserId = lead.assignTo?._id?.toString();

        // 1️⃣ Email to customer (optional)
        if (lead.email) {
          await sendEmail({
            to: lead.email,
            subject: `Follow-up Reminder: ${lead.leadName}`,
            text: `Hi ${
              lead.leadName || ""
            },\n\nThis is a friendly reminder from our team. Your lead is currently ${
              lead.status
            }. We'll reach out shortly.`,
          });
          console.log("📧 Email sent to customer:", lead.email);
        }

        // 2️⃣ Notify Salesman
        if (assignUserId) {
          notifyUser(assignUserId, "missed_followup", {
            title: "Missed Follow-Up",
            message: `⚠️ You missed a follow-up for Lead: ${
              lead.leadName || "Unnamed Lead"
            }`,
            leadId: lead._id.toString(),
            followUpAt: lead.followUpDate?.toISOString(),
          });
        }

        // 3️⃣ Notify Admin(s) for each missed follow-up
        const admins = await getAdminUserIds();
        notifyAdmins(admins, "missed_followup_admin", {
          title: "Missed Follow-Up Alert",
          message: `Salesman ${
            lead.assignTo?.firstName || "Unknown"
          } missed follow-up for Lead: "${lead.leadName}"`,
          salesman: lead.assignTo?.firstName || "Unknown",
          leadId: lead._id.toString(),
          status: lead.status,
          followUpAt: lead.followUpDate?.toISOString(),
        });

        // 4️⃣ Mark reminder sent
        lead.lastReminderAt = new Date();
        await lead.save();
      }
    } catch (err) {
      console.error("❌ followUp cron error:", err.message);
    }
  });
}
