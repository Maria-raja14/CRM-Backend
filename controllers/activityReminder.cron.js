import cron from "node-cron";
import dayjs from "dayjs";
import Activity from "../models/activity.models.js";
import { notifyUser, notifyAdmins } from "../realtime/socket.js";
import User from "../models/user.model.js";
import Role from "../models/role.model.js";

const SHOULD_REMIND_EVERY_MINUTES = 60;

// get all admin ids
const getAdminUserIds = async () => {
  const adminRole = await Role.findOne({ name: "Admin" });
  if (!adminRole) return [];
  const admins = await User.find({ role: adminRole._id }, "_id");
  return admins.map((a) => a._id.toString());
};

// export function startActivityReminderCron() {
//   cron.schedule("* * * * *", async () => {
//     const now = dayjs();
//     console.log("🕒 Activity Reminder Cron:", now.format("YYYY-MM-DD HH:mm:ss"));

//     try {
//       const dueActivities = await Activity.find({
//         reminder: { $lte: now.toDate() },
//         $or: [
//           { lastReminderAt: { $exists: false } },
//           {
//             lastReminderAt: {
//               $lt: now.subtract(SHOULD_REMIND_EVERY_MINUTES, "minute").toDate(),
//             },
//           },
//         ],
//       }).populate("assignedTo", "firstName lastName email _id");

//       if (!dueActivities.length) return;

//       for (const act of dueActivities) {
//         const userId = act.assignedTo?._id?.toString();

//         // 1️⃣ Notify salesman (assigned user)
//         if (userId) {
//           notifyUser(userId, "activity_reminder", {
//             title: "⏰ Activity Reminder",
//             message: `Reminder for activity: "${act.title}"`,
//             activityId: act._id.toString(),
//             startAt: act.startDate,
//           });
//           console.log("📩 Activity reminder sent ->", userId);
//         }

//         // 2️⃣ Notify admins also (optional)
//         const admins = await getAdminUserIds();
//         if (admins.length > 0) {
//           notifyAdmins(admins, "activity_reminder_admin", {
//             title: "⏰ Activity Reminder",
//             message: `User ${
//               act.assignedTo?.firstName || "Unknown"
//             } has activity "${act.title}" now.`,
//             activityId: act._id.toString(),
//             startAt: act.startDate,
//           });
//         }

//         // 3️⃣ Mark reminder sent
//         act.lastReminderAt = new Date();
//         await act.save();
//       }
//     } catch (err) {
//       console.error("❌ Activity reminder cron error:", err.message);
//     }
//   });
// }

export function startActivityReminderCron() {
  cron.schedule("* * * * *", async () => {
    const now = dayjs();
    console.log("🕒 Activity Reminder Cron:", now.format("YYYY-MM-DD HH:mm:ss"));

    try {
      const dueActivities = await Activity.find({
        startDate: { $exists: true },          // activity ku start time irukanum
        reminderBefore: { $exists: true },     // reminder option select pannirukanum
        $or: [
          { lastReminderAt: { $exists: false } },
          {
            lastReminderAt: {
              $lt: now.subtract(SHOULD_REMIND_EVERY_MINUTES, "minute").toDate(),
            },
          },
        ],
      }).populate("assignedTo", "firstName lastName email _id");

      if (!dueActivities.length) return;

      for (const act of dueActivities) {
        const reminderTime = dayjs(act.startDate).subtract(act.reminderBefore, "minute");

        // 🔑 Trigger only if current time ≈ reminderTime (within 1 min range)
        if (Math.abs(now.diff(reminderTime, "minute")) < 1) {
          const userId = act.assignedTo?._id?.toString();

          // 1️⃣ Notify salesman (assigned user)
          if (userId) {
            notifyUser(userId, "activity_reminder", {
              title: "⏰ Activity Reminder",
              message: `Reminder for activity: "${act.title}"`,
              activityId: act._id.toString(),
              startAt: act.startDate,
            });
            console.log("📩 Activity reminder sent ->", userId);
          }

          // 2️⃣ Notify admins
          const admins = await getAdminUserIds();
          if (admins.length > 0) {
            notifyAdmins(admins, "activity_reminder_admin", {
              title: "⏰ Activity Reminder",
              message: `User ${
                act.assignedTo?.firstName || "Unknown"
              } has activity "${act.title}" at ${dayjs(act.startDate).format(
                "HH:mm"
              )}.`,
              activityId: act._id.toString(),
              startAt: act.startDate,
            });
          }

          // 3️⃣ Mark reminder sent
          act.lastReminderAt = new Date();
          await act.save();
        }
      }
    } catch (err) {
      console.error("❌ Activity reminder cron error:", err.message);
    }
  });
}
