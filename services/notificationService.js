// services/notificationService.js
import User from "../models/user.model.js";
import Notification from "../models/notification.model.js";
import { notifyUser } from "../realtime/socket.js";
import moment from "moment";

export const sendNotification = async (userId, text, type = "followup", meta = {}) => {
  try {
    console.log(`📨 Creating notification for user ${userId}: ${text}`);

    // Check for duplicate notifications within the last minute
    const exists = await Notification.findOne({
      userId,
      type,
      $or: [
        { "meta.leadId": meta.leadId },
        { "meta.proposalId": meta.proposalId },
        { "meta.dealId": meta.dealId }
      ],
      createdAt: { $gte: moment().subtract(1, "minute").toDate() },
    });

    if (exists) {
      console.log("⚠️ Duplicate notification found, skipping");
      return exists;
    }

    let profileImage = meta.profileImage || null;

    // If no profile image in meta, try to get from user
    if (!profileImage) {
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

    console.log(`✅ Notification created with ID: ${notif._id}`);

    // Send real-time notification via socket
    notifyUser(userId, "new_notification", {
      id: notif._id,
      text: notif.text,
      type: notif.type,
      meta: notif.meta,
      profileImage: notif.profileImage,
      createdAt: notif.createdAt,
    });

    console.log(`📤 Real-time notification sent to user ${userId}`);
    return notif;
  } catch (error) {
    console.error("❌ Error in sendNotification:", error);
    throw error;
  }
};