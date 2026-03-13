

// import User from "../models/user.model.js";
// import Lead from "../models/leads.model.js"; // to get assigned salesman
// import Notification from "../models/notification.model.js";
// import { notifyUser } from "../realtime/socket.js";
// import moment from "moment";

// export const sendNotification = async (userId, text, type = "followup", meta = {}) => {
//   const exists = await Notification.findOne({
//     userId,
//     type,
//     "meta.leadId": meta.leadId,
//     createdAt: { $gte: moment().subtract(1, "minute").toDate() },
//   });

//   if (exists) return exists;

//   let profileImage = null;

//   // ✅ For followups, get assigned salesman profileImage
//   if (type === "followup" && meta.leadId) {
//     const lead = await Lead.findById(meta.leadId).populate("assignTo", "profileImage firstName lastName");
//     if (lead && lead.assignTo) {
//       profileImage = lead.assignTo.profileImage?.replace(/\\/g, "/") || null;
//       meta.salesmanName = `${lead.assignTo.firstName} ${lead.assignTo.lastName}`;
//     }
//   } else {
//     // fallback: use userId (admin) profileImage
//     const user = await User.findById(userId).select("profileImage");
//     profileImage = user?.profileImage?.replace(/\\/g, "/") || null;
//   }

//   const notif = await Notification.create({
//     userId,
//     text,
//     type,
//     meta,
//     expiresAt: moment().add(24, "hours").toDate(),
//     profileImage,
//   });

//   notifyUser(userId, "new_notification", {
//     id: notif._id,
//     text: notif.text,
//     type: notif.type,
//     meta: notif.meta,
//     profileImage: notif.profileImage,
//   });

//   return notif;
// };
// //original


import User from "../models/user.model.js";
import Lead from "../models/leads.model.js";
import Notification from "../models/notification.model.js";
import { notifyUser } from "../realtime/socket.js";

// ✅ FIX: Deduplication window matches cron cooldown (24h)
const DEDUP_MINUTES = 1440;

export const sendNotification = async (
  userId,
  text,
  type = "followup",
  meta = {}
) => {
  // ── Deduplication check ────────────────────────────────────────────
  const cutoff = new Date(Date.now() - DEDUP_MINUTES * 60 * 1000);

  const exists = await Notification.findOne({
    userId,
    type,
    "meta.leadId": meta.leadId,
    createdAt: { $gte: cutoff },
  });

  if (exists) return exists;

  // ── Resolve profile image ──────────────────────────────────────────
  let profileImage = null;

  if (type === "followup" && meta.leadId) {
    // For follow-up notifications get the assigned salesman's avatar
    const lead = await Lead.findById(meta.leadId).populate(
      "assignTo",
      "profileImage firstName lastName"
    );
    if (lead?.assignTo) {
      profileImage =
        lead.assignTo.profileImage?.replace(/\\/g, "/") || null;
      // Attach salesman name to meta so the frontend can display it
      meta.salesmanName = `${lead.assignTo.firstName} ${lead.assignTo.lastName}`;
    }
  } else {
    // Fallback: use the notification recipient's avatar
    const user = await User.findById(userId).select("profileImage");
    profileImage = user?.profileImage?.replace(/\\/g, "/") || null;
  }

  // ── Persist to DB ──────────────────────────────────────────────────
  // ✅ FIX: Use plain new Date() arithmetic — no moment dependency for
  //    date math keeps this timezone-agnostic.
  const notif = await Notification.create({
    userId,
    text,
    type,
    meta,
    profileImage,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // +24 h
  });

  // ── Push via WebSocket (if user is online) ─────────────────────────
  notifyUser(userId, "new_notification", {
    _id:          notif._id,      // ✅ FIX: use _id (not id) to match socket.js shape
    text:         notif.text,
    type:         notif.type,
    meta:         notif.meta,
    profileImage: notif.profileImage,
    createdAt:    notif.createdAt,
  });

  return notif;
};