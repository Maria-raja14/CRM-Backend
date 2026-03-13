

// import cron from "node-cron";
// import dayjs from "dayjs";
// import utc from "dayjs/plugin/utc.js";
// import Activity from "../models/activity.models.js";
// import Notification from "../models/notification.model.js";
// import { notifyUser } from "../realtime/socket.js";
// import User from "../models/user.model.js";
// import Role from "../models/role.model.js";

// dayjs.extend(utc);

// const SHOULD_REMIND_EVERY_MINUTES = 1440;

// // ✅ Get all admin IDs
// const getAdminUserIds = async () => {
//   const adminRole = await Role.findOne({ name: "Admin" });
//   if (!adminRole) return [];
//   const admins = await User.find({ role: adminRole._id }, "_id");
//   return admins.map((a) => a._id.toString());
// };

// //  Safe notification creator with deduplication
// const sendNotification = async (
//   userId,
//   title,
//   text,
//   type = "activity",
//   meta = {}
// ) => {
//   //  Check if a similar notification already exists
//   const exists = await Notification.findOne({
//     userId,
//     type,
//     "meta.activityId": meta.activityId,
//     createdAt: { $gte: dayjs().subtract(SHOULD_REMIND_EVERY_MINUTES, "minute").toDate() },
//   });

//   if (exists) {
//     return null;
//   }

//   const notif = await Notification.create({
//     userId,
//     type,
//     title,
//     text,
//     meta,
//     expiresAt: dayjs().add(24, "hour").toDate(),
//   });

//   notifyUser(
//     userId,
//     type === "activity" ? "activity_reminder" : "admin_reminder",
//     notif
//   );

//   return notif;
// };

// export function startActivityReminderCron() {
//   cron.schedule("* * * * *", async () => {
//     const now = dayjs().utc();
//     console.log("🕒 Activity Reminder Cron:", now.format());

//     try {
//       const dueActivities = await Activity.find({
//         startDate: { $exists: true },
//         reminder: { $exists: true },
//         $or: [
//           { lastReminderAt: { $exists: false } },
//           { lastReminderAt: null },
//           {
//             lastReminderAt: {
//               $lt: now.subtract(SHOULD_REMIND_EVERY_MINUTES, "minute").toDate(),
//             },
//           },
//         ],
//       }).populate("assignedTo", "firstName lastName email _id");

//       for (const act of dueActivities) {
//         const reminderTime = dayjs(act.reminder).utc();

//         // ✅ Only trigger if reminder time has passed
//         if (now.isSame(reminderTime) || now.isAfter(reminderTime)) {
//           const userId = act.assignedTo?._id?.toString();

//           // Assigned user notification
//           if (userId) {
//             await sendNotification(
//               userId,
//               "⏰ Activity Reminder",
//               `Reminder for activity: "${act.title}"`,
//               "activity",
//               { activityId: act._id.toString(), startAt: act.startDate }
//             );
//           }

//           // Admins notification
//           const admins = await getAdminUserIds();
//           for (const adminId of admins) {
//             await sendNotification(
//               adminId,
//               "⏰ Activity Reminder (Admin)",
//               `${act.assignedTo?.firstName || "Unknown"} has activity "${
//                 act.title
//               }" at ${dayjs(act.startDate).utc().format("HH:mm")}.`,
//               "admin",
//               { activityId: act._id.toString(), startAt: act.startDate }
//             );
//           }

//           // ✅ Mark reminder as sent
//           act.lastReminderAt = new Date();
//           await act.save();
//         }
//       }
//     } catch (err) {
//       console.error("❌ Activity reminder cron error:", err.message);
//     }
//   });
// }//original




import cron from "node-cron";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import Activity from "../models/activity.models.js";
import Notification from "../models/notification.model.js";
import { notifyUser } from "../realtime/socket.js";
import User from "../models/user.model.js";
import Role from "../models/role.model.js";

dayjs.extend(utc);

const SHOULD_REMIND_EVERY_MINUTES = 1440;

// Get Admin IDs
const getAdminUserIds = async () => {
  const adminRole = await Role.findOne({ name: "Admin" });
  if (!adminRole) return [];
  const admins = await User.find({ role: adminRole._id }, "_id");
  return admins.map((a) => a._id.toString());
};

// Prevent duplicate notifications
const notificationExists = async (userId, activityId) => {
  const existing = await Notification.findOne({
    userId,
    type: "activity",
    "meta.activityId": activityId,
    createdAt: {
      $gte: dayjs().subtract(SHOULD_REMIND_EVERY_MINUTES, "minute").toDate(),
    },
  });

  return !!existing;
};

const sendNotification = async (
  userId,
  title,
  text,
  type = "activity",
  meta = {}
) => {
  const exists = await notificationExists(userId, meta.activityId);

  if (exists) return null;

  const notif = await Notification.create({
    userId,
    type,
    text,
    meta,
    expiresAt: dayjs().add(24, "hour").toDate(),
  });

  notifyUser(
    userId,
    type === "activity" ? "activity_reminder" : "admin_reminder",
    notif
  );

  return notif;
};

export function startActivityReminderCron() {
  cron.schedule("* * * * *", async () => {
    const now = dayjs().utc();

    console.log("🕒 Activity Reminder Cron:", now.format());

    try {
      const dueActivities = await Activity.find({
        startDate: { $exists: true },
        reminder: { $exists: true },
        $or: [
          { lastReminderAt: { $exists: false } },
          { lastReminderAt: null },
          {
            lastReminderAt: {
              $lt: now
                .subtract(SHOULD_REMIND_EVERY_MINUTES, "minute")
                .toDate(),
            },
          },
        ],
      }).populate("assignedTo", "firstName lastName email _id");

      for (const act of dueActivities) {
        const reminderTime = dayjs(act.reminder).utc();

        if (now.isSame(reminderTime) || now.isAfter(reminderTime)) {
          const userId = act.assignedTo?._id?.toString();

          if (userId) {
            await sendNotification(
              userId,
              "⏰ Activity Reminder",
              `Reminder for activity: "${act.title}"`,
              "activity",
              { activityId: act._id.toString(), startAt: act.startDate }
            );
          }

          const admins = await getAdminUserIds();

          for (const adminId of admins) {
            await sendNotification(
              adminId,
              "⏰ Activity Reminder (Admin)",
              `${act.assignedTo?.firstName || "Unknown"} has activity "${
                act.title
              }"`,
              "admin",
              { activityId: act._id.toString(), startAt: act.startDate }
            );
          }

          act.lastReminderAt = new Date();
          await act.save();
        }
      }
    } catch (err) {
      console.error("❌ Activity reminder cron error:", err.message);
    }
  });
}//notification come correctly..





// import cron from "node-cron";
// import Activity     from "../models/activity.models.js";
// import Notification from "../models/notification.model.js";
// import { notifyUser } from "../realtime/socket.js";
// import User         from "../models/user.model.js";
// import Role         from "../models/role.model.js";

// // 24 hours in milliseconds
// const COOLDOWN_MS = 24 * 60 * 60 * 1000;

// // ── Helpers ────────────────────────────────────────────────────────────────

// const getAdminUserIds = async () => {
//   const adminRole = await Role.findOne({ name: "Admin" });
//   if (!adminRole) return [];
//   const admins = await User.find({ role: adminRole._id }, "_id");
//   return admins.map((a) => a._id.toString());
// };

// // Returns true if an activity notification was already sent within COOLDOWN_MS
// const notificationExists = async (userId, activityId) => {
//   const cutoff = new Date(Date.now() - COOLDOWN_MS);
//   const existing = await Notification.findOne({
//     userId,
//     type:               "activity",
//     "meta.activityId":  activityId,
//     createdAt:          { $gte: cutoff },
//   });
//   return !!existing;
// };

// // Create + push one notification (with dedup guard)
// const sendActivityNotification = async (userId, text, type, meta) => {
//   // ✅ FIX: dedup key is activityId (not leadId) — was missing in old version
//   const alreadySent = await notificationExists(userId, meta.activityId);
//   if (alreadySent) return null;

//   const notif = await Notification.create({
//     userId,
//     type,
//     text,
//     meta,
//     expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
//   });

//   // Push via WebSocket
//   notifyUser(
//     userId,
//     type === "activity" ? "activity_reminder" : "admin_reminder",
//     {
//       _id:       notif._id,      // ✅ FIX: _id not id — consistent with socket.js
//       text:      notif.text,
//       type:      notif.type,
//       meta:      notif.meta,
//       createdAt: notif.createdAt,
//     }
//   );

//   return notif;
// };

// // ── Cron ───────────────────────────────────────────────────────────────────

// export function startActivityReminderCron() {

//   cron.schedule("* * * * *", async () => {

//     // ✅ FIX 1: Use plain new Date() instead of dayjs().utc()
//     //    dayjs().utc() formats as a string internally and loses ms precision.
//     //    new Date() is always UTC epoch ms — safe on all servers.
//     const now = new Date();
//     const cooldownCutoff = new Date(now.getTime() - COOLDOWN_MS);

//     console.log("🕒 Activity Reminder Cron:", now.toISOString());

//     try {
//       // ✅ FIX 2: Old query fetched ALL activities every minute because it
//       //    only filtered on $exists. Now we also filter reminder <= now
//       //    so only genuinely due activities are loaded.
//       const dueActivities = await Activity.find({
//         reminder: {
//           $exists: true,
//           $ne:     null,
//           $lte:    now,         // ✅ only activities whose reminder has passed
//         },
//         $or: [
//           { lastReminderAt: { $exists: false } },
//           { lastReminderAt: null },
//           { lastReminderAt: { $lt: cooldownCutoff } },
//         ],
//       }).populate("assignedTo", "firstName lastName email _id");

//       console.log(`📋 Due activities: ${dueActivities.length}`);

//       for (const act of dueActivities) {
//         const userId     = act.assignedTo?._id?.toString();
//         const activityId = act._id.toString();

//         // ── Notify assigned user ───────────────────────────────────────
//         if (userId) {
//           await sendActivityNotification(
//             userId,
//             `⏰ Reminder for activity: "${act.title}"`,
//             "activity",
//             { activityId, startAt: act.startDate }
//           );
//           console.log(`✅ Activity notif → ${userId} | "${act.title}"`);
//         }

//         // ── Notify all admins ──────────────────────────────────────────
//         const admins = await getAdminUserIds();
//         for (const adminId of admins) {
//           await sendActivityNotification(
//             adminId,
//             `${act.assignedTo?.firstName || "Someone"} has activity: "${act.title}"`,
//             "admin",
//             { activityId, startAt: act.startDate }
//           );
//           console.log(`✅ Admin activity notif → ${adminId} | "${act.title}"`);
//         }

//         // ✅ FIX 3: stamp lastReminderAt so cron skips within cooldown
//         act.lastReminderAt = now;
//         await act.save();
//       }

//     } catch (err) {
//       console.error("❌ Activity reminder cron error:", err.message, err.stack);
//     }
//   });
// }//final code..