// controllers/notification.controller.js
import Notification from "../models/notification.model.js";
import User from "../models/user.model.js"
import Lead from "../models/leads.model.js";

export default {
  // Get notifications for a user
//  getUserNotifications: async (req, res) => {
//   try {
//     const { userId } = req.params;
//     const now = new Date();

//     const notifications = await Notification.find({
//       userId,
//       $or: [
//         { expiresAt: { $exists: false } },
//         { expiresAt: { $gte: now } }, // ✅ Only non-expired
//       ],
//     }) 

//       .sort({ createdAt: -1 })
//       .limit(50);

//     res.status(200).json(notifications);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// },
 getUserNotifications: async (req, res) => {
  try {
    const { userId } = req.params;
    const now = new Date();

    // Fetch non-expired notifications
    let notifications = await Notification.find({
      userId,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gte: now } },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(); // convert to plain JS objects so we can modify

    for (let notif of notifications) {
      // 1️⃣ If followup and leadId exists → get assigned salesman's profileImage
      if (notif.type === "followup" && notif.meta?.leadId) {
        const lead = await Lead.findById(notif.meta.leadId).populate(
          "assignTo",
          "profileImage firstName lastName"
        );

        if (lead?.assignTo) {
          notif.profileImage = lead.assignTo.profileImage?.replace(/\\/g, "/") || null;
          notif.userName = `${lead.assignTo.firstName} ${lead.assignTo.lastName}`;
        }
      }

      // 2️⃣ Fallback → use userId (admin) profileImage if still missing
      // if (!notif.profileImage && notif.userId) {
      //   const user = await User.findById(notif.userId).select("profileImage firstName lastName");
      //   if (user) {
      //     notif.profileImage = user.profileImage?.replace(/\\/g, "/") || null;
      //     notif.userName = `${user.firstName} ${user.lastName}`;
      //   }
      // }
    }

    res.status(200).json(notifications);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
},


  // Mark notification as read
  markAsRead: async (req, res) => {
    try {
      const { id } = req.params;
      const notif = await Notification.findByIdAndUpdate(id, { read: true }, { new: true });
      if (!notif) return res.status(404).json({ message: "Notification not found" });
      res.status(200).json({ message: "Notification marked as read", notif });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  // Delete notification
  deleteNotification: async (req, res) => {
    try {
      const { id } = req.params;
      const notif = await Notification.findByIdAndDelete(id);
      if (!notif) return res.status(404).json({ message: "Notification not found" });
      res.status(200).json({ message: "Notification deleted" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
};
