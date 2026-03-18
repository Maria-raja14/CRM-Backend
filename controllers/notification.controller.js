// // controllers/notification.controller.js
// import Notification from "../models/notification.model.js";
// import User from "../models/user.model.js"
// import Lead from "../models/leads.model.js";

// export default {

// //  getUserNotifications: async (req, res) => {
// //   try {
// //     const { userId } = req.params;
// //     const now = new Date();

// //     // Fetch non-expired notifications
// //     let notifications = await Notification.find({
// //       userId,
// //       $or: [
// //         { expiresAt: { $exists: false } },
// //         { expiresAt: { $gte: now } },
// //       ],
// //     })
// //       .sort({ createdAt: -1 })
// //       .limit(50)
// //       .lean(); // convert to plain JS objects so we can modify

// //     for (let notif of notifications) {
// //       // 1️⃣ If followup and leadId exists → get assigned salesman's profileImage
// //       if (notif.type === "followup" && notif.meta?.leadId) {
// //         const lead = await Lead.findById(notif.meta.leadId).populate(
// //           "assignTo",
// //           "profileImage firstName lastName"
// //         );

// //         if (lead?.assignTo) {
// //           notif.profileImage = lead.assignTo.profileImage?.replace(/\\/g, "/") || null;
// //           notif.userName = `${lead.assignTo.firstName} ${lead.assignTo.lastName}`;
// //         }
// //       }

// //       // 2️⃣ Fallback → use userId (admin) profileImage if still missing
// //       // if (!notif.profileImage && notif.userId) {
// //       //   const user = await User.findById(notif.userId).select("profileImage firstName lastName");
// //       //   if (user) {
// //       //     notif.profileImage = user.profileImage?.replace(/\\/g, "/") || null;
// //       //     notif.userName = `${user.firstName} ${user.lastName}`;
// //       //   }
// //       // }
// //     }

// //     res.status(200).json(notifications);

// //   } catch (err) {
// //     console.error(err);
// //     res.status(500).json({ message: err.message });
// //   }
// // },//old one..


//   // Mark notification as read
  
//     // ── Get notifications for a user ──────────────────────────────────────────
//   // ✅ FIX: Only return notifications created TODAY (after midnight).
//   //    Old/yesterday notifications are completely excluded from the response.
//   //    We also still honour expiresAt so anything expired mid-day is hidden too.
  
  
//   getUserNotifications: async (req, res) => {
//     try {
//       const { userId } = req.params;
//       const now = new Date();
 
//       // Midnight of the current day (server timezone)
//       const startOfToday = new Date();
//       startOfToday.setHours(0, 0, 0, 0);
 
//       let notifications = await Notification.find({
//         userId,
//         createdAt: { $gte: startOfToday }, // ✅ today only — no yesterday dates
//         $or: [
//           { expiresAt: { $exists: false } },
//           { expiresAt: { $gte: now } },     // ✅ not yet expired
//         ],
//       })
//         .sort({ createdAt: -1 })
//         .limit(50)
//         .lean();
 
//       // Enrich follow-up notifications with salesman profile image
//       for (let notif of notifications) {
//         if (notif.type === "followup" && notif.meta?.leadId) {
//           const lead = await Lead.findById(notif.meta.leadId).populate(
//             "assignTo",
//             "profileImage firstName lastName"
//           );
 
//           if (lead?.assignTo) {
//             notif.profileImage =
//               lead.assignTo.profileImage?.replace(/\\/g, "/") || null;
//             notif.userName = `${lead.assignTo.firstName} ${lead.assignTo.lastName}`;
//           }
//         }
//       }
 
//       res.status(200).json(notifications);
//     } catch (err) {
//       console.error(err);
//       res.status(500).json({ message: err.message });
//     }
//   },
  
  
//   markAsRead: async (req, res) => {
//     try {
//       const { id } = req.params;
//       const notif = await Notification.findByIdAndUpdate(id, { read: true }, { new: true });
//       if (!notif) return res.status(404).json({ message: "Notification not found" });
//       res.status(200).json({ message: "Notification marked as read", notif });
//     } catch (err) {
//       res.status(500).json({ message: err.message });
//     }
//   },



// deleteNotification: async (req, res) => {

//   const { id } = req.params;

//   const notif = await Notification.findByIdAndDelete(id);

//   if (!notif) {
//     return res.status(404).json({ message: "Not found" });
//   }

//   res.json({ success: true });

// },

//   // Bulk delete notifications
// bulkDeleteNotifications: async (req, res) => {
//   try {
//     const { ids } = req.body; // array of notification IDs
//     if (!ids || !Array.isArray(ids) || ids.length === 0) {
//       return res.status(400).json({ message: "No IDs provided" });
//     }
//     await Notification.deleteMany({ _id: { $in: ids } });
//     res.status(200).json({ success: true, deletedCount: ids.length });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// },
  
  
// };
// //original code notification come correctly..




// controllers/notification.controller.js
import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";
import Lead from "../models/leads.model.js";

export default {

  // ── Get notifications for a user ──────────────────────────────────────────
  // RULE: Only return notifications where:
  //   1. createdAt >= today midnight  (no past-day notifications ever)
  //   2. expiresAt > now              (not yet expired)
  // A notification created yesterday at 11 PM with expiresAt today at 11 PM
  // will be EXCLUDED because createdAt < today midnight, even though it
  // hasn't technically expired yet. Past date = gone, period.

  getUserNotifications: async (req, res) => {
    try {
      const { userId } = req.params;
      const now = new Date();

      // Midnight of the current calendar day (server local time)
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const notifications = await Notification.find({
        userId,
        // ✅ RULE 1 — created today only
        createdAt: { $gte: startOfToday },
        // ✅ RULE 2 — not expired
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: null },
          { expiresAt: { $gt: now } },
        ],
      })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      // Enrich follow-up notifications with the salesman's profile image
      for (const notif of notifications) {
        if (notif.type === "followup" && notif.meta?.leadId) {
          const lead = await Lead.findById(notif.meta.leadId).populate(
            "assignTo",
            "profileImage firstName lastName"
          );
          if (lead?.assignTo) {
            notif.profileImage =
              lead.assignTo.profileImage?.replace(/\\/g, "/") || null;
            notif.userName = `${lead.assignTo.firstName} ${lead.assignTo.lastName}`;
          }
        }
      }

      res.status(200).json(notifications);
    } catch (err) {
      console.error("getUserNotifications error:", err);
      res.status(500).json({ message: err.message });
    }
  },

  // ── Mark a single notification as read ───────────────────────────────────
  markAsRead: async (req, res) => {
    try {
      const { id } = req.params;
      const notif = await Notification.findByIdAndUpdate(
        id,
        { read: true },
        { new: true }
      );
      if (!notif)
        return res.status(404).json({ message: "Notification not found" });
      res.status(200).json({ message: "Notification marked as read", notif });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  // ── Delete a single notification ─────────────────────────────────────────
  deleteNotification: async (req, res) => {
    try {
      const { id } = req.params;
      const notif = await Notification.findByIdAndDelete(id);
      if (!notif)
        return res.status(404).json({ message: "Not found" });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  // ── Bulk delete notifications ─────────────────────────────────────────────
  bulkDeleteNotifications: async (req, res) => {
    try {
      const { ids } = req.body;
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "No IDs provided" });
      }
      await Notification.deleteMany({ _id: { $in: ids } });
      res.status(200).json({ success: true, deletedCount: ids.length });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
};