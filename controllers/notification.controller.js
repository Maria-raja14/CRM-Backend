// controllers/notification.controller.js
import Notification from "../models/notification.model.js";

export default {
  // Get notifications for a user
  getUserNotifications: async (req, res) => {
    try {
      const { userId } = req.params;
      const notifications = await Notification.find({ userId })
        .sort({ createdAt: -1 })
        .limit(50); // latest 50
      res.status(200).json(notifications);
    } catch (err) {
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
