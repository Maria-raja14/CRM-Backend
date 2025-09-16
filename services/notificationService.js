

import User from "../models/user.model.js";
import Lead from "../models/leads.model.js"; // to get assigned salesman
import Notification from "../models/notification.model.js";
import { notifyUser } from "../realtime/socket.js";
import moment from "moment";

export const sendNotification = async (userId, text, type = "followup", meta = {}) => {
  const exists = await Notification.findOne({
    userId,
    type,
    "meta.leadId": meta.leadId,
    createdAt: { $gte: moment().subtract(1, "minute").toDate() },
  });

  if (exists) return exists;

  let profileImage = null;

  // ✅ For followups, get assigned salesman profileImage
  if (type === "followup" && meta.leadId) {
    const lead = await Lead.findById(meta.leadId).populate("assignTo", "profileImage firstName lastName");
    if (lead && lead.assignTo) {
      profileImage = lead.assignTo.profileImage?.replace(/\\/g, "/") || null;
      meta.salesmanName = `${lead.assignTo.firstName} ${lead.assignTo.lastName}`;
    }
  } else {
    // fallback: use userId (admin) profileImage
    const user = await User.findById(userId).select("profileImage");
    profileImage = user?.profileImage?.replace(/\\/g, "/") || null;
  }

  const notif = await Notification.create({
    userId,
    text,
    type,
    meta,
    expiresAt: moment().add(24, "hours").toDate(),
    profileImage,
  });

  notifyUser(userId, "new_notification", {
    id: notif._id,
    text: notif.text,
    type: notif.type,
    meta: notif.meta,
    profileImage: notif.profileImage,
  });

  return notif;
};
