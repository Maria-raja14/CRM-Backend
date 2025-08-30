

import Notification from "../models/notification.model.js"
import { notifyUser } from "../realtime/socket.js";
import moment from "moment";
export const sendNotification = async (userId, text, type = "followup", meta = {}) => {
  const exists = await Notification.findOne({
    userId,
    type,
    "meta.leadId": meta.leadId,
    createdAt: { $gte: moment().subtract(1, "minute").toDate() }, // prevent spamming
  });

  if (exists) {
    console.log("⏩ Skipping duplicate notification:", text);
    return exists;
  }

  const notif = await Notification.create({ userId, text, type, meta });

  notifyUser(userId, "new_notification", {
    id: notif._id,
    text: notif.text,
    type: notif.type,
    meta: notif.meta,
  });

  // console.log("🚀 Notification sent to user:", userId, "->", text);
  return notif;
};
