


import cron from "node-cron";
import dayjs from "dayjs";
import Lead from "../models/leads.model.js";
import User from "../models/user.model.js";   // ✅ Import User model
import Role from "../models/role.model.js";
import moment from "moment"
import sendEmail from "../services/email.js";
import { notifyUser, notifyAdmins } from "../realtime/socket.js";

// Avoid duplicate reminders within the same gap
const SHOULD_REMIND_EVERY_MINUTES = 1;

// Example: Get admin userIds (replace with DB fetch later)
const getAdminUserIds = async () => {
  const adminRole = await Role.findOne({ name: "Admin" });
  if (!adminRole) {
    console.log("⚠️ No Admin role found in DB");
    return [];
  }

  const admins = await User.find({ role: adminRole._id }, "_id");
  const adminIds = admins.map((a) => a._id.toString());

  console.log("👑 Admin IDs fetched:", adminIds);
  return adminIds;
};

export function startFollowUpCron() {
  cron.schedule("* * * * *", async () => {
    const now = dayjs();
    console.log("🕒 Follow-up Cron:", now.format("YYYY-MM-DD HH:mm:ss"));

    try {
      const now = moment();
      
      const dueLeads = await Lead.find({
        followUpDate: { $lte: now.toDate() },
        status: { $in: ["Hot", "Warm", "Cold"] },
        $or: [
          { lastReminderAt: { $exists: false } },
          {
            lastReminderAt: {
              $lt: moment().subtract(SHOULD_REMIND_EVERY_MINUTES, "minute").toDate(),
            },
          },
        ],
      }).populate("assignTo", "firstName lastName email _id");

      if (!dueLeads.length) return;

      for (const lead of dueLeads) {
        const assignUserId = lead.assignTo?._id?.toString();

        // 1 Email to customer (optional)
        // if (lead.email) {
        //   await sendEmail({
        //     to: lead.email,
        //     subject: `Follow-up Reminder: ${lead.leadName}`,
        //     text: `Hi ${lead.leadName || ""},\n\nThis is a friendly reminder from our team.`,
        //   });
        //   console.log("📧 Email sent to customer:", lead.email);
        // }

        // 2 Notify Salesman
        if (assignUserId) {
          notifyUser(assignUserId, "missed_followup", {
            title: "Missed Follow-Up",
            message: `⚠️ You missed a follow-up for Lead: ${
              lead.leadName || "U nnamed Lead"
            }`,
            leadId: lead._id.toString(),
            followUpAt: lead.followUpDate?.toISOString(),
          });
        }

        // 3️ Notify Admin(s)
        const admins = await getAdminUserIds();
        if (admins.length > 0) {
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
        } else {
          console.log("⚠️ No admins found to notify");
        }

        // 4️⃣ Mark reminder sent
        lead.lastReminderAt = new Date();
        await lead.save();
      }
    } catch (err) {
      console.error("❌ followUp cron error:", err.message);
    }
  });
}
