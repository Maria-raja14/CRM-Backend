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

// Get all admin IDs
const getAdminUserIds = async () => {
  const adminRole = await Role.findOne({ name: "Admin" });
  if (!adminRole) return [];
  const admins = await User.find({ role: adminRole._id }, "_id");
  return admins.map((a) => a._id.toString());
};

// Send & save notification helper
const sendNotification = async (
  userId,
  title,
  text,
  type = "activity",
  meta = {}
) => {
  const notif = await Notification.create({
    userId,
    type,
    title,
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
              $lt: now.subtract(SHOULD_REMIND_EVERY_MINUTES, "minute").toDate(),
            },
          },
        ],
      }).populate("assignedTo", "firstName lastName email _id");

      for (const act of dueActivities) {
        const reminderTime = dayjs(act.reminder).utc();

        // Trigger if reminder time has passed or is now
        if (now.isSame(reminderTime) || now.isAfter(reminderTime)) {
          const userId = act.assignedTo?._id?.toString();

          // Notify assigned user
          if (userId) {
            await sendNotification(
              userId,
              "⏰ Activity Reminder",
              `Reminder for activity: "${act.title}"`,
              "activity",
              { activityId: act._id.toString(), startAt: act.startDate }
            );
          }

          // Notify admins
          const admins = await getAdminUserIds();
          for (const adminId of admins) {
            await sendNotification(
              adminId,
              "⏰ Activity ",
              ` ${act.assignedTo?.firstName || "Unknown"} has activity "${
                act.title
              }" at ${dayjs(act.startDate).utc().format("HH:mm")}.`,
              "admin",
              { activityId: act._id.toString(), startAt: act.startDate }
            );
          }

          // Mark reminder sent
          act.lastReminderAt = new Date();
          await act.save();
        } else {
          console.log(
            "⏳ Not time yet for activity:",
            act.title,
            "Reminder:",
            reminderTime.format()
          );
        }
      }
    } catch (err) {
      console.error("❌ Activity reminder cron error:", err.message);
    }
  });
}
