

// import cron from "node-cron";
// import Lead from "../models/leads.model.js";
// import User from "../models/user.model.js";
// import Role from "../models/role.model.js";
// import Notification from "../models/notification.model.js";
// import moment from "moment"; // ✅ keep only moment
// import { sendNotification } from "../services/notificationService.js";
// import sendEmail from "../services/email.js"; // ✅ make sure this exists

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

//       const admins = await getAdminUserIds();

//       for (const lead of dueLeads) {
//         // ✅ Recompute lead score whenever a reminder is sent
//         try {
//           lead.leadScore = computeLeadScore(
//             lead.toObject ? lead.toObject() : lead
//           );
//         } catch {
//           lead.leadScore = lead.leadScore || 0;
//         }

//         const assignUserId = lead.assignTo?._id?.toString();

//         // ----- 🔔 Notification for Salesperson -----
//         if (assignUserId) {
//           await sendNotification(
//             assignUserId,
//             `⚠️ You missed a follow-up for Lead: ${
//               lead.leadName || "Unnamed Lead"
//             }`,
//             "followup",
//             { leadId: lead._id.toString() }
//           );
//         }

//         // ----- 🔔 Notification for Admins -----
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
//               salesmanId: lead.assignTo?._id?.toString(),
//             }
//           );
//         }

//         // ----- 📧 Email to Lead -----
//         // ----- 📧 Email to Lead -----
//         if (lead.email) {
//           const followUpDate = moment(lead.followUpDate).format("DD-MM-YYYY");
//           const subject = `👋 Follow-Up Reminder — ${lead.leadName}`;
//           const htmlMessage = `
//     <p>Dear ${lead.leadName},</p>
//     <p>This is a reminder for our scheduled follow-up on ${followUpDate}.</p>
//     <p>We would love to know your thoughts or updates regarding your requirements.</p>
//     <p>Please reply to this email or let us know a convenient time for a quick call.</p>
//     <br/>
//     <p>— Your CRM Team</p>
//   `;
//           await sendEmail({ to: lead.email, subject, html: htmlMessage });
//           console.log(`📧 Follow-up email sent to Lead: ${lead.leadName}`);
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
//       const deleted = await Notification.deleteMany({
//         expiresAt: { $lte: now },
//       });
//       console.log("🗑️ Deleted expired notifications:", deleted.deletedCount);
//     } catch (err) {
//       console.error("❌ Error deleting expired notifications:", err);
//     }
//   });
// }//original





// import cron from "node-cron";
// import Lead from "../models/leads.model.js";
// import User from "../models/user.model.js";
// import Role from "../models/role.model.js";
// import Notification from "../models/notification.model.js";
// import moment from "moment";
// import { sendNotification } from "../services/notificationService.js";
// import sendEmail from "../services/email.js";

// // reminder interval lock (1 day)
// const SHOULD_REMIND_EVERY_MINUTES = 1440;

// // get admin user ids
// const getAdminUserIds = async () => {
//   const adminRole = await Role.findOne({ name: "Admin" });

//   if (!adminRole) return [];

//   const admins = await User.find({ role: adminRole._id }, "_id");

//   return admins.map((a) => a._id.toString());
// };

// export function startFollowUpCron() {

//   cron.schedule("* * * * *", async () => {

//     const nowUtc = moment.utc();

//     console.log("🕒 Follow-up Cron:", nowUtc.format());

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

//       const admins = await getAdminUserIds();

//       for (const lead of dueLeads) {

//         const assignUserId = lead.assignTo?._id?.toString();

//         // -----------------------------
//         // 🔔 Notification for Salesman
//         // -----------------------------
//         if (assignUserId) {

//           await sendNotification(
//             assignUserId,
//             `⚠️ You missed a follow-up for Lead: ${lead.leadName || "Unnamed Lead"}`,
//             "followup",
//             { leadId: lead._id.toString() }
//           );

//         }

//         // -----------------------------
//         // 🔔 Notification for Admins
//         // -----------------------------
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

//         // ------------------------------------
//         // 📧 EMAIL SEND ONLY ONCE PER DAY
//         // ------------------------------------

//         // const today = moment().startOf("day");

//         // if (
//         //   lead.email &&
//         //   (
//         //     !lead.lastEmailSentAt ||
//         //     moment(lead.lastEmailSentAt).isBefore(today)
//         //   )
//         // ) {

//         //   const followUpDate = moment(lead.followUpDate).format("DD-MM-YYYY");

//         //   const subject = `👋 Follow-Up Reminder — ${lead.leadName}`;

//         //   const htmlMessage = `
//         //     <p>Dear ${lead.leadName},</p>

//         //     <p>This is a reminder for our scheduled follow-up on ${followUpDate}.</p>

//         //     <p>We would love to know your thoughts or updates regarding your requirements.</p>

//         //     <p>Please reply to this email or let us know a convenient time for a quick call.</p>

//         //     <br/>

//         //     <p>— Your CRM Team</p>
//         //   `;

//         //   await sendEmail({
//         //     to: lead.email,
//         //     subject,
//         //     html: htmlMessage
//         //   });

//         //   console.log(`📧 Email sent to Lead: ${lead.leadName}`);

//         //   // lock email for today
//         //   lead.lastEmailSentAt = new Date();

//         // }

//         // -----------------------------
//         // mark reminder sent
//         // -----------------------------
//         lead.lastReminderAt = new Date();

//         await lead.save();

//       }

//     } catch (err) {

//       console.error("❌ followUp cron error:", err);

//     }

//   });

//   // --------------------------------
//   // 🧹 AUTO DELETE EXPIRED NOTIFICATIONS
//   // --------------------------------
//   cron.schedule("0 * * * *", async () => {

//     try {

//       const now = new Date();

//       const deleted = await Notification.deleteMany({
//         expiresAt: { $lte: now }
//       });

//       console.log("🗑️ Deleted expired notifications:", deleted.deletedCount);

//     } catch (err) {

//       console.error("❌ Notification cleanup error:", err);

//     }

//   });

// }//original



import cron from "node-cron";
import Lead from "../models/leads.model.js";
import User from "../models/user.model.js";
import Role from "../models/role.model.js";
import Notification from "../models/notification.model.js";
import moment from "moment";
import { sendNotification } from "../services/notificationService.js";
import sendEmail from "../services/email.js";

const SHOULD_REMIND_EVERY_MINUTES = 1440;

// Get Admin IDs
const getAdminUserIds = async () => {
  const adminRole = await Role.findOne({ name: "Admin" });

  if (!adminRole) return [];

  const admins = await User.find({ role: adminRole._id }, "_id");

  return admins.map((a) => a._id.toString());
};

//  Prevent duplicate notifications
const notificationExists = async (userId, leadId) => {
  const existing = await Notification.findOne({
    userId,
    type: "followup",
    "meta.leadId": leadId,
    createdAt: {
      $gte: moment().subtract(SHOULD_REMIND_EVERY_MINUTES, "minute").toDate(),
    },
  });

  return !!existing;
};

export function startFollowUpCron() {
  cron.schedule("* * * * *", async () => {
    const nowUtc = moment.utc();

    console.log("🕒 Follow-up Cron:", nowUtc.format());

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
        const assignUserId = lead.assignTo?._id?.toString();

        // -------------------------
        // Salesman notification
        // -------------------------
        if (assignUserId) {
          const exists = await notificationExists(
            assignUserId,
            lead._id.toString()
          );

          if (!exists) {
            await sendNotification(
              assignUserId,
              `⚠️ You missed a follow-up for Lead: ${
                lead.leadName || "Unnamed Lead"
              }`,
              "followup",
              { leadId: lead._id.toString() }
            );
          }
        }

        // -------------------------
        // Admin notifications
        // -------------------------
        for (const adminId of admins) {
          const exists = await notificationExists(
            adminId,
            lead._id.toString()
          );

          if (!exists) {
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
        }

        // mark reminder sent
        lead.lastReminderAt = new Date();
        await lead.save();
      }
    } catch (err) {
      console.error("❌ followUp cron error:", err);
    }
  });

  // Auto delete expired notifications
  cron.schedule("0 * * * *", async () => {
    try {
      const now = new Date();

      const deleted = await Notification.deleteMany({
        expiresAt: { $lte: now },
      });

      console.log("🗑️ Deleted expired notifications:", deleted.deletedCount);
    } catch (err) {
      console.error("❌ Notification cleanup error:", err);
    }
  });
}