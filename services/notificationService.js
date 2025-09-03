


import Notification from "../models/notification.model.js";
import { notifyUser } from "../realtime/socket.js";
import moment from "moment";

export const sendNotification = async (userId, text, type = "followup", meta = {}) => {
  // Prevent duplicate within last 1 minute
  const exists = await Notification.findOne({
    userId,
    type,
    "meta.leadId": meta.leadId,
    createdAt: { $gte: moment().subtract(1, "minute").toDate() },
  });

  if (exists) {
    console.log("⏩ Skipping duplicate notification:", text);
    return exists;
  }

  const notif = await Notification.create({
    userId,
    text,
    type,
    meta,
    expiresAt: moment().add(24, "hours").toDate(), // ✅ Auto expire after 24 hours
  });
console.log("Notification",notif)
  notifyUser(userId, "new_notification", {
    id: notif._id,
    text: notif.text,
    type: notif.type,
    meta: notif.meta,
  });

  return notif;
};
