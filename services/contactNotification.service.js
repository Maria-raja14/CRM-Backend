import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";
import Role from "../models/role.model.js";
import { notifyUser } from "../realtime/socket.js";

export const sendContactFormNotification = async ({ text, meta }) => {
  const adminRole = await Role.findOne({ name: { $regex: /^admin$/i } });
  if (!adminRole) {
    console.log("⚠️ Admin role not found");
    return []; // don't throw, just skip notifications
  }

  const users = await User.find({ role: adminRole._id }).select("_id profileImage");
  if (!users.length) {
    console.log("⚠️ No users found for admin role");
    return [];
  }

  const notifications = [];

  for (const user of users) {
    try {
      console.log("📤 Sending notification to user:", user._id.toString());

      const notif = await Notification.create({
        userId: user._id,
        text,
        type: "contact_form",
        meta,
        profileImage: user.profileImage || null,
      });

      try {
        notifyUser(user._id, "new_notification", {
          id: notif._id,
          text: notif.text,
          type: notif.type,
          meta: notif.meta,
          profileImage: notif.profileImage,
        });
      } catch (socketErr) {
        console.log("⚠️ Socket notify failed for user:", user._id, socketErr);
      }

      notifications.push(notif);
    } catch (err) {
      console.log("⚠️ Failed to send notification for user:", user._id, err);
    }
  }

  return notifications;
};
