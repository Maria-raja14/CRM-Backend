// import cron from "node-cron";
// import dayjs from "dayjs";
// import Lead from "../models/leads.model.js";
// import User from "../models/user.model.js"; // ✅ Import User model
// import Role from "../models/role.model.js";
// import moment from "moment";
// import sendEmail from "../services/email.js";
// import { notifyUser, notifyAdmins } from "../realtime/socket.js";

// import { sendNotification } from "../services/notificationService.js";

// // Avoid duplicate reminders within the same gap
// const SHOULD_REMIND_EVERY_MINUTES = 1;

// // Example: Get admin userIds (replace with DB fetch later)
// const getAdminUserIds = async () => {
//   const adminRole = await Role.findOne({ name: "Admin" });
//   if (!adminRole) {
//     console.log("⚠️ No Admin role found in DB");
//     return [];
//   }

//   const admins = await User.find({ role: adminRole._id }, "_id");
//   const adminIds = admins.map((a) => a._id.toString());

//   console.log("👑 Admin IDs fetched:", adminIds);
//   return adminIds;
// };

// export function startFollowUpCron() {
//   cron.schedule("* * * * *", async () => {
//     const now = moment();
//     console.log("🕒 Follow-up Cron:", now.format("YYYY-MM-DD HH:mm:ss"));

//     try {
// //       const dueLeads = await Lead.find({
// //         followUpDate: { $lte: now.toDate() },
// //         status: { $in: ["Hot", "Warm", "Cold"] },
// //         $or: [
// //           { lastReminderAt: { $exists: false } },
// //           {
// //             lastReminderAt: {
// //               $lt: moment()
// //                 .subtract(SHOULD_REMIND_EVERY_MINUTES, "minute")
// //                 .toDate(),
// //             },
// //           },
// //         ],
// //       }).populate("assignTo", "firstName lastName email _id");
// // console.log("🔍 Due leads found:", dueLeads.length);

// const nowUtc = moment.utc();

// const dueLeads = await Lead.find({
//   followUpDate: { $lte: nowUtc.toDate() }, // ✅ UTC compare
//   status: { $in: ["Hot", "Warm", "Cold"] },
//   $or: [
//     { lastReminderAt: { $exists: false } },
//     { lastReminderAt: null },
//     {
//       lastReminderAt: {
//         $lt: nowUtc
//           .clone()
//           .subtract(SHOULD_REMIND_EVERY_MINUTES, "minute")
//           .toDate(),
//       },
//     },
//   ],
// }).populate("assignTo", "firstName lastName email _id");

// console.log("⏰ Now UTC:", nowUtc.format());
// console.log("📋 Due leads found:", dueLeads.length);


//       if (!dueLeads.length) return;

//       // ✅ THIS IS WHERE YOUR sendNotification LOOP GOES
//       for (const lead of dueLeads) {
//         const assignUserId = lead.assignTo?._id?.toString();

//         if (assignUserId) {
//           await sendNotification(
//             assignUserId,
//             `⚠️ You missed a follow-up for Lead: ${
//               lead.leadName || "Unnamed Lead"
//             }`,
//             "followup",
//             {
//               leadId:
//                 lead._id.toString() /* , followUpAt: lead.followUpDate?.toISOString() */,
//             }
//           );
//         }
//         // ✅ Email send only once
//         // if (lead.email && !lead.emailSentAt) {
//         //   await sendEmail({
//         //     to: lead.email,
//         //     subject: `Follow-up Reminder: ${lead.leadName}`,
//         //     text: `Hi ${
//         //       lead.leadName || ""
//         //     },\n\nThis is a friendly reminder from our team.`,
//         //   });
//         //   console.log("📧 Email sent to customer:", lead.email);

//         //   lead.emailSentAt = new Date(); // mark email as sent
//         // }

//         const admins = await getAdminUserIds();
//         for (const adminId of admins) {
//           await sendNotification(
//             adminId,
//             `Salesman ${
//               lead.assignTo?.firstName || "Unknown"
//             } missed follow-up for Lead: ${lead.leadName}`,
//             "followup",
//             {
//               leadId: lead._id.toString(),
//               salesman: lead.assignTo?.firstName || "Unknown",
//             }
//           );
//         }

//         lead.lastReminderAt = new Date();
//         await lead.save();
//       }
//     } catch (err) {
//       console.error("❌ followUp cron error:", err.message);
//     }
//   });
// }



// import cron from "node-cron";
// import Lead from "../models/leads.model.js";
// import User from "../models/user.model.js";
// import Role from "../models/role.model.js";
// import moment from "moment"; // ✅ keep only moment
// import { sendNotification } from "../services/notificationService.js";

// // Avoid duplicate reminders within the same gap
// const SHOULD_REMIND_EVERY_MINUTES = 120;

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

// export function startFollowUpCron() {
//   cron.schedule("* * * * *", async () => {
//     const nowUtc = moment.utc();
//     console.log("🕒 Follow-up Cron:", nowUtc.format("YYYY-MM-DD HH:mm:ss"));
//     console.log("⏰ Now UTC:", nowUtc.format());

//     try {
//       const dueLeads = await Lead.find({
//         followUpDate: { $lte: nowUtc.toDate() }, // ✅ compare in UTC
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

//       console.log("📋 Due leads found:", dueLeads.length);
//       if (!dueLeads.length) return;

//       for (const lead of dueLeads) {
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
//            // ✅ Email send only once
// //         // if (lead.email && !lead.emailSentAt) {
// //         //   await sendEmail({
// //         //     to: lead.email,
// //         //     subject: `Follow-up Reminder: ${lead.leadName}`,
// //         //     text: `Hi ${
// //         //       lead.leadName || ""
// //         //     },\n\nThis is a friendly reminder from our team.`,
// //         //   });
// //         //   console.log("📧 Email sent to customer:", lead.email);

// //         //   lead.emailSentAt = new Date(); // mark email as sent
// //         // }

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
//             }
//           );
//         }

//         // ✅ mark reminder as sent
//         lead.lastReminderAt = new Date();
//         await lead.save();
//       }
//     } catch (err) {
//       console.error("❌ followUp cron error:", err);
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
