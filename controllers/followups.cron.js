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
// controllers/followups.cron.js



import cron from "node-cron";
import Lead from "../models/leads.model.js";
import User from "../models/user.model.js";
import Role from "../models/role.model.js";
import Notification from "../models/notification.model.js";
import moment from "moment";
import { sendNotification } from "../services/notificationService.js";

const SHOULD_REMIND_EVERY_MINUTES = 1440; // 24 hours

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
    console.log("🕒 Lead Follow-up Cron Running:", nowUtc.format("YYYY-MM-DD HH:mm:ss"));

    try {
      // Find leads with follow-up date that has passed
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
      }).populate("assignTo", "firstName lastName email _id profileImage");

      if (!dueLeads.length) {
        console.log("📊 No due leads found");
        return;
      }

      console.log(`📊 Found ${dueLeads.length} due leads`);
      const admins = await getAdminUserIds();

      for (const lead of dueLeads) {
        const assignUserId = lead.assignTo?._id?.toString();
        const salesmanName = lead.assignTo ? 
          `${lead.assignTo.firstName || ''} ${lead.assignTo.lastName || ''}`.trim() : 
          'Unassigned';

        console.log(`Processing lead: ${lead.leadName}, Assigned to: ${salesmanName}`);

        // ----- 🔔 Notification for Salesperson -----
        if (assignUserId) {
          const result = await sendNotification(
            assignUserId,
            `Salesman missed follow-up for Lead: ${lead.leadName}`,
            "followup",
            { 
              leadId: lead._id.toString(),
              leadName: lead.leadName,
              salesmanName: salesmanName,
              profileImage: lead.assignTo?.profileImage
            }
          );
          console.log(`✅ Sent notification to salesperson: ${salesmanName}, Result:`, result ? 'Success' : 'Failed');
        }

        // ----- 🔔 Notification for Admins -----
        for (const adminId of admins) {
          await sendNotification(
            adminId,
            `Salesman ${salesmanName} missed follow-up for Lead: ${lead.leadName}`,
            "admin",
            {
              leadId: lead._id.toString(),
              leadName: lead.leadName,
              salesmanName: salesmanName,
              salesmanId: lead.assignTo?._id?.toString(),
            }
          );
        }

        // ✅ Mark reminder as sent
        lead.lastReminderAt = new Date();
        await lead.save();
        console.log(`✅ Updated lastReminderAt for lead: ${lead.leadName}`);
      }
    } catch (err) {
      console.error("❌ Lead followUp cron error:", err);
    }
  });
}