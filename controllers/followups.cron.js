

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



// import cron from "node-cron";
// import Lead from "../models/leads.model.js";
// import User from "../models/user.model.js";
// import Role from "../models/role.model.js";
// import Notification from "../models/notification.model.js";
// import moment from "moment";
// import { sendNotification } from "../services/notificationService.js";
// import sendEmail from "../services/email.js";

// const SHOULD_REMIND_EVERY_MINUTES = 1440;

// // Get Admin IDs
// const getAdminUserIds = async () => {
//   const adminRole = await Role.findOne({ name: "Admin" });

//   if (!adminRole) return [];

//   const admins = await User.find({ role: adminRole._id }, "_id");

//   return admins.map((a) => a._id.toString());
// };

// //  Prevent duplicate notifications
// const notificationExists = async (userId, leadId) => {
//   const existing = await Notification.findOne({
//     userId,
//     type: "followup",
//     "meta.leadId": leadId,
//     createdAt: {
//       $gte: moment().subtract(SHOULD_REMIND_EVERY_MINUTES, "minute").toDate(),
//     },
//   });

//   return !!existing;
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

//         // -------------------------
//         // Salesman notification
//         // -------------------------
//         if (assignUserId) {
//           const exists = await notificationExists(
//             assignUserId,
//             lead._id.toString()
//           );

//           if (!exists) {
//             await sendNotification(
//               assignUserId,
//               `⚠️ You missed a follow-up for Lead: ${
//                 lead.leadName || "Unnamed Lead"
//               }`,
//               "followup",
//               { leadId: lead._id.toString() }
//             );
//           }
//         }

//         // -------------------------
//         // Admin notifications
//         // -------------------------
//         for (const adminId of admins) {
//           const exists = await notificationExists(
//             adminId,
//             lead._id.toString()
//           );

//           if (!exists) {
//             await sendNotification(
//               adminId,
//               `Salesman ${
//                 lead.assignTo?.firstName || "Unknown"
//               } missed follow-up for Lead: ${lead.leadName}`,
//               "followup",
//               {
//                 leadId: lead._id.toString(),
//                 salesman: lead.assignTo?.firstName || "Unknown",
//                 salesmanId: lead.assignTo?._id?.toString(),
//               }
//             );
//           }
//         }

//         // mark reminder sent
//         lead.lastReminderAt = new Date();
//         await lead.save();
//       }
//     } catch (err) {
//       console.error("❌ followUp cron error:", err);
//     }
//   });

//   // Auto delete expired notifications
//   cron.schedule("0 * * * *", async () => {
//     try {
//       const now = new Date();

//       const deleted = await Notification.deleteMany({
//         expiresAt: { $lte: now },
//       });

//       console.log("🗑️ Deleted expired notifications:", deleted.deletedCount);
//     } catch (err) {
//       console.error("❌ Notification cleanup error:", err);
//     }
//   });
// }//notification come correctly..


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

// Prevent duplicate notifications within the cooldown window
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
    // ✅ FIX: Always use new Date() — MongoDB stores dates as UTC internally.
    // moment.utc() was causing a mismatch on live servers because the
    // followUpDate saved from local was already UTC in MongoDB.
    // Using `new Date()` gives the correct UTC "now" in all environments.
    const now = new Date();

    console.log("🕒 Follow-up Cron running at:", now.toISOString());

    try {
      // ✅ FIX: Add a 5-minute future buffer so leads created "just now"
      // are caught even if the cron fires slightly before the exact time.
      const bufferTime = new Date(now.getTime() + 5 * 60 * 1000); // now + 5 min

      const dueLeads = await Lead.find({
        // ✅ FIX: Use bufferTime instead of exact now — catches leads
        // whose followUpDate was set to "today/now" but may be slightly
        // in the future due to clock skew between client and server.
        followUpDate: { $lte: bufferTime },
        status: { $in: ["Hot", "Warm", "Cold"] },
        $or: [
          { lastReminderAt: { $exists: false } },
          { lastReminderAt: null },
          {
            lastReminderAt: {
              $lt: new Date(
                now.getTime() - SHOULD_REMIND_EVERY_MINUTES * 60 * 1000
              ),
            },
          },
        ],
      }).populate("assignTo", "firstName lastName email _id");

      console.log(`📋 Found ${dueLeads.length} due leads`);

      if (!dueLeads.length) return;

      const admins = await getAdminUserIds();

      for (const lead of dueLeads) {
        const assignUserId = lead.assignTo?._id?.toString();

        // ── Salesman notification ──────────────────────────────────────
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
            console.log(
              `✅ Salesman notif sent → userId: ${assignUserId}, lead: ${lead.leadName}`
            );
          }
        }

        // ── Admin notifications ────────────────────────────────────────
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
            console.log(
              `✅ Admin notif sent → adminId: ${adminId}, lead: ${lead.leadName}`
            );
          }
        }

        // Mark reminder sent so we don't re-fire within the cooldown
        lead.lastReminderAt = now;
        await lead.save();
      }
    } catch (err) {
      console.error("❌ followUp cron error:", err);
    }
  });

  // Auto-delete expired notifications every hour
  cron.schedule("0 * * * *", async () => {
    try {
      const deleted = await Notification.deleteMany({
        expiresAt: { $lte: new Date() },
      });
      console.log("🗑️ Deleted expired notifications:", deleted.deletedCount);
    } catch (err) {
      console.error("❌ Notification cleanup error:", err);
    }
  });
}//ok fine



// import cron         from "node-cron";
// import Lead         from "../models/leads.model.js";
// import User         from "../models/user.model.js";
// import Role         from "../models/role.model.js";
// import Notification from "../models/notification.model.js";
// import { sendNotification } from "../services/notificationService.js";

// // 24 hours in milliseconds — single source of truth
// const COOLDOWN_MS = 24 * 60 * 60 * 1000;

// // ── Helpers ────────────────────────────────────────────────────────────────

// const getAdminUserIds = async () => {
//   const adminRole = await Role.findOne({ name: "Admin" });
//   if (!adminRole) return [];
//   const admins = await User.find({ role: adminRole._id }, "_id");
//   return admins.map((a) => a._id.toString());
// };

// // Returns true if a followup notification was already sent within COOLDOWN_MS
// const notificationExists = async (userId, leadId) => {
//   const cutoff = new Date(Date.now() - COOLDOWN_MS);
//   const existing = await Notification.findOne({
//     userId,
//     type:          "followup",
//     "meta.leadId": leadId,
//     createdAt:     { $gte: cutoff },
//   });
//   return !!existing;
// };

// // ── Cron ───────────────────────────────────────────────────────────────────

// export function startFollowUpCron() {

//   // Runs every minute
//   cron.schedule("* * * * *", async () => {

//     // ✅ FIX 1: plain new Date() — Node.js Date is always UTC.
//     //    moment.utc() was causing timezone skew on production servers
//     //    because the live server TZ differed from local dev TZ.
//     const now = new Date();

//     // ✅ FIX 2: +5 min buffer window.
//     //    When a lead is created, followUpDate = new Date() (creation time).
//     //    The cron fires every 60 s; without a buffer, leads whose
//     //    followUpDate is "now" might be missed if the cron fires 1-2 s early.
//     const bufferNow    = new Date(now.getTime() + 5  * 60 * 1000);
//     const cooldownCutoff = new Date(now.getTime() - COOLDOWN_MS);

//     console.log("🕒 FollowUp Cron:", now.toISOString());

//     try {
//       const dueLeads = await Lead.find({
//         followUpDate: { $lte: bufferNow },           // due now (+ buffer)
//         status:       { $in: ["Hot", "Warm", "Cold"] },
//         $or: [
//           { lastReminderAt: { $exists: false } },
//           { lastReminderAt: null },
//           { lastReminderAt: { $lt: cooldownCutoff } }, // outside cooldown
//         ],
//       }).populate("assignTo", "firstName lastName email _id");

//       console.log(`📋 Due leads: ${dueLeads.length}`);
//       if (!dueLeads.length) return;

//       const admins = await getAdminUserIds();

//       for (const lead of dueLeads) {
//         const assignUserId = lead.assignTo?._id?.toString();
//         const leadId       = lead._id.toString();
//         const leadName     = lead.leadName || "Unnamed Lead";

//         // ── Notify assigned salesman ───────────────────────────────────
//         if (assignUserId) {
//           const alreadySent = await notificationExists(assignUserId, leadId);
//           if (!alreadySent) {
//             await sendNotification(
//               assignUserId,
//               `⚠️ You missed a follow-up for Lead: ${leadName}`,
//               "followup",
//               { leadId }
//             );
//             console.log(`✅ Salesman notified → ${assignUserId} | "${leadName}"`);
//           }
//         }

//         // ── Notify all admins ──────────────────────────────────────────
//         for (const adminId of admins) {
//           const alreadySent = await notificationExists(adminId, leadId);
//           if (!alreadySent) {
//             await sendNotification(
//               adminId,
//               `Salesman ${lead.assignTo?.firstName || "Unknown"} missed follow-up for Lead: ${leadName}`,
//               "followup",
//               {
//                 leadId,
//                 salesman:   lead.assignTo?.firstName || "Unknown",
//                 salesmanId: assignUserId,
//               }
//             );
//             console.log(`✅ Admin notified → ${adminId} | "${leadName}"`);
//           }
//         }

//         // ✅ FIX 3: stamp lastReminderAt so cron skips this lead for COOLDOWN_MS
//         lead.lastReminderAt = now;
//         await lead.save();
//       }

//     } catch (err) {
//       console.error("❌ FollowUp cron error:", err.message, err.stack);
//     }
//   });

//   // ── Purge expired notifications every hour ─────────────────────────────
//   cron.schedule("0 * * * *", async () => {
//     try {
//       const result = await Notification.deleteMany({
//         expiresAt: { $lte: new Date() },
//       });
//       console.log("🗑️ Expired notifications deleted:", result.deletedCount);
//     } catch (err) {
//       console.error("❌ Notification cleanup error:", err.message);
//     }
//   });
// }//ok fine..