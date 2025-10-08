// import cron from "node-cron";
// import Lead from "../models/leads.model.js";
// import User from "../models/user.model.js";
// import Role from "../models/role.model.js";
// import Notification from "../models/notification.model.js";
// import moment from "moment"; // ✅ keep only moment
// import { sendNotification } from "../services/notificationService.js";
// import { computeLeadScore } from "../utils/leadScore.js"; // ✅ compute lead score

// // Avoid duplicate reminders within the same gap (in minutes)
// const SHOULD_REMIND_EVERY_MINUTES = 1440;

// // ✅ Get Admin UserIds
// const getAdminUserIds = async () => {
//   const adminRole = await Role.findOne({ name: "Admin" });
//   if (!adminRole) {
//     console.log("⚠️ No Admin role found in DB");
//     return [];
//   }

//   const admins = await User.find({ role: adminRole._id }, "_id");
//   return admins.map((a) => a._id.toString());
// };

// // ---------- Follow-Up Cron (every minute) ----------
// export function startFollowUpCron() {
//   cron.schedule("* * * * *", async () => {
//     const nowUtc = moment.utc();
//     console.log("🕒 Follow-up Cron:", nowUtc.format("YYYY-MM-DD HH:mm:ss"));

//     try {
//       const dueLeads = await Lead.find({
//         followUpDate: { $lte: nowUtc.toDate() },
//         status: { $in: ["Hot", "Warm", "Cold"] },
//         $or: [
//           { lastReminderAt: { $exists: false } },
//           { lastReminderAt: null },
//           {
//             lastReminderAt: {
//               $lt: nowUtc
//                 .clone()
//                 .subtract(SHOULD_REMIND_EVERY_MINUTES, "minute")
//                 .toDate(),
//             },
//           },
//         ],
//       }).populate("assignTo", "firstName lastName email _id");

//       if (!dueLeads.length) return;

//       for (const lead of dueLeads) {
//         // ✅ Recompute lead score whenever a reminder is sent
//         try {
//           lead.leadScore = computeLeadScore(lead.toObject ? lead.toObject() : lead);
//         } catch {
//           lead.leadScore = lead.leadScore || 0;
//         }

//         const assignUserId = lead.assignTo?._id?.toString();

//         // Notify assigned user
//         if (assignUserId) {
//           await sendNotification(
//             assignUserId,
//             `⚠️ You missed a follow-up for Lead: ${lead.leadName || "Unnamed Lead"}`,
//             "followup",
//             { leadId: lead._id.toString() }
//           );
//         }

//         // Notify Admins
//         const admins = await getAdminUserIds();
//         for (const adminId of admins) {
//           await sendNotification(
//             adminId,
//             `Salesman ${lead.assignTo?.firstName || "Unknown"} missed follow-up for Lead: ${lead.leadName}`,
//             "followup",
//             {
//               leadId: lead._id.toString(),
//               salesman: lead.assignTo?.firstName || "Unknown",
//               salesmanId: lead.assignTo?._id?.toString(),
//             }
//           );
//         }

//         // ✅ Mark reminder as sent
//         lead.lastReminderAt = new Date();
//         await lead.save();
//       }
//     } catch (err) {
//       console.error("❌ followUp cron error:", err);
//     }
//   });

//   // ---------- Cleanup Expired Notifications Cron (every hour) ----------
//   cron.schedule("0 * * * *", async () => {
//     try {
//       const now = new Date();
//       const deleted = await Notification.deleteMany({ expiresAt: { $lte: now } });
//       console.log("🗑️ Deleted expired notifications:", deleted.deletedCount);
//     } catch (err) {
//       console.error("❌ Error deleting expired notifications:", err);
//     }
//   });
// }

import cron from "node-cron";
import Lead from "../models/leads.model.js";
import User from "../models/user.model.js";
import Role from "../models/role.model.js";
import Notification from "../models/notification.model.js";
import moment from "moment"; // ✅ keep only moment
import { sendNotification } from "../services/notificationService.js";
import { computeLeadScore } from "../utils/leadScore.js"; // ✅ compute lead score
import sendEmail from "../services/email.js"; // ✅ make sure this exists

// Avoid duplicate reminders within the same gap (in minutes)
const SHOULD_REMIND_EVERY_MINUTES = 1440;

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

      if (!dueLeads.length) return;

      const admins = await getAdminUserIds();

      for (const lead of dueLeads) {
        // ✅ Recompute lead score whenever a reminder is sent
        try {
          lead.leadScore = computeLeadScore(
            lead.toObject ? lead.toObject() : lead
          );
        } catch {
          lead.leadScore = lead.leadScore || 0;
        }

        const assignUserId = lead.assignTo?._id?.toString();

        // ----- 🔔 Notification for Salesperson -----
        if (assignUserId) {
          await sendNotification(
            assignUserId,
            `⚠️ You missed a follow-up for Lead: ${
              lead.leadName || "Unnamed Lead"
            }`,
            "followup",
            { leadId: lead._id.toString() }
          );
        }

        // ----- 🔔 Notification for Admins -----
        for (const adminId of admins) {
          await sendNotification(
            adminId,
            `Salesman ${
              lead.assignTo?.firstName || "Unknown"
            } missed follow-up for Lead: ${lead.leadName}`,
            "followup",
            {
              leadId: lead._id.toString(),
              salesman: lead.assignTo?.firstName || "Unknown",
              salesmanId: lead.assignTo?._id?.toString(),
            }
          );
        }

        // ----- 📧 Email to Lead -----
        // ----- 📧 Email to Lead -----
        if (lead.email) {
          const followUpDate = moment(lead.followUpDate).format("DD-MM-YYYY");
          const subject = `👋 Follow-Up Reminder — ${lead.leadName}`;
          const htmlMessage = `
    <p>Dear ${lead.leadName},</p>
    <p>This is a reminder for our scheduled follow-up on ${followUpDate}.</p>
    <p>We would love to know your thoughts or updates regarding your requirements.</p>
    <p>Please reply to this email or let us know a convenient time for a quick call.</p>
    <br/>
    <p>— Your CRM Team</p>
  `;
          await sendEmail({ to: lead.email, subject, html: htmlMessage });
          console.log(`📧 Follow-up email sent to Lead: ${lead.leadName}`);
        }

        // ✅ Mark reminder as sent
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
      const deleted = await Notification.deleteMany({
        expiresAt: { $lte: now },
      });
      console.log("🗑️ Deleted expired notifications:", deleted.deletedCount);
    } catch (err) {
      console.error("❌ Error deleting expired notifications:", err);
    }
  });
}
