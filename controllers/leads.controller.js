// import dayjs from "dayjs";
// import Lead from "../models/leads.model.js";
// import userModel from "../models/user.model.js";
// import sendEmail from "../services/email.js";
// import { notifyUser } from "../realtime/socket.js";
// import Deal from "../models/deals.model.js";
// import Notification from "../models/notification.model.js"; // ✅ NEW: needed to delete stale notifications

// const pickNextSalesUser = async () => {
//   const users = await userModel
//     .find({})
//     .populate("role", "name")
//     .select("_id firstName lastName role createdAt")
//     .sort({ createdAt: 1, _id: 1 })
//     .lean();

//   const salesUsers = users.filter((u) => {
//     const roleName =
//       typeof u.role === "string"
//         ? u.role
//         : u.role?.name || u.role?.roleName || "";
//     return String(roleName).toLowerCase() === "sales";
//   });

//   if (!salesUsers.length) return null;

//   const lastLead = await Lead.findOne({ assignTo: { $ne: null } })
//     .sort({ createdAt: -1, _id: -1 })
//     .select("assignTo")
//     .lean();

//   if (!lastLead?.assignTo) return salesUsers[0]._id;

//   const lastIdx = salesUsers.findIndex(
//     (u) => u._id.toString() === lastLead.assignTo.toString()
//   );

//   const nextIdx = lastIdx === -1 ? 0 : (lastIdx + 1) % salesUsers.length;
//   return salesUsers[nextIdx]._id;
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // ✅ NEW HELPER: When followUpDate changes, delete all old "followup"
// //    notifications for that lead from the DB and immediately push
// //    "notification_deleted" via socket to each affected user.
// //
// //    This makes the old notification (e.g. 17-3-26) disappear from the
// //    frontend instantly — no page refresh needed.
// //    When the new date (19-3-26) arrives, the cron will create fresh ones.
// // ─────────────────────────────────────────────────────────────────────────────
// const deleteStaleFollowUpNotifications = async (leadId) => {
//   try {
//     const oldNotifications = await Notification.find({
//       "meta.leadId": String(leadId),
//       type:          "followup",
//     }).lean();

//     if (oldNotifications.length === 0) return;

//     // Delete from DB
//     await Notification.deleteMany({
//       "meta.leadId": String(leadId),
//       type:          "followup",
//     });

//     // Group deleted IDs by userId — each user only gets their own IDs
//     const userNotifMap = new Map();
//     oldNotifications.forEach((n) => {
//       const uid = String(n.userId);
//       if (!userNotifMap.has(uid)) userNotifMap.set(uid, []);
//       userNotifMap.get(uid).push(String(n._id));
//     });

//     // Emit "notification_deleted" to each user's socket
//     // NotificationContext already listens to this and removes them from state
//     for (const [userId, ids] of userNotifMap.entries()) {
//       notifyUser(userId, "notification_deleted", { ids });
//     }

//     console.log(
//       `🗑️ Deleted ${oldNotifications.length} stale followup notification(s) for lead ${leadId}`
//     );
//   } catch (err) {
//     console.error("❌ Error deleting stale notifications:", err.message);
//   }
// };

// export default {

//   // ➡️ Create Lead
//   createLead: async (req, res) => {
//     try {
//       const { leadName, destination, phoneNumber } = req.body;

//       if (!leadName || !destination || !phoneNumber) {
//         return res.status(400).json({
//           message: "Lead name, destination, and phone number are required",
//         });
//       }

//       const data = { ...req.body };

//       if (req.files?.length > 0) {
//         data.attachments = req.files.map((file) => ({
//           name:       file.originalname,
//           path:       `uploads/leads/${file.filename}`,
//           type:       file.mimetype,
//           size:       file.size,
//           uploadedAt: new Date(),
//         }));
//       }

//       const autoAssignee = await pickNextSalesUser();
//       data.assignTo = autoAssignee;

//       if (!data.status) data.status = "Cold";

//       // Use user-picked date — never override with today
//       if (
//         data.followUpDate &&
//         data.followUpDate !== "null" &&
//         data.followUpDate.trim() !== ""
//       ) {
//         data.followUpDate = new Date(data.followUpDate);
//       } else {
//         data.followUpDate = null;
//       }

//       data.lastReminderAt = null;

//       const lead      = new Lead(data);
//       const savedLead = await lead.save();

//       res.status(201).json({ message: "Lead created successfully", lead: savedLead });
//     } catch (error) {
//       res.status(400).json({ message: error.message });
//     }
//   },

//   // ➡️ Get All Leads (paginated)
//   getLeads: async (req, res) => {
//     try {
//       const page  = Math.max(1, parseInt(req.query.page)  || 1);
//       const limit = Math.max(1, parseInt(req.query.limit) || 10);
//       const skip  = (page - 1) * limit;

//       const filter =
//         req.user.role.name === "Admin" ? {} : { assignTo: req.user._id };

//       const [leads, totalLeads] = await Promise.all([
//         Lead.find(filter)
//           .populate("assignTo", "firstName lastName email role")
//           .sort({ createdAt: -1 })
//           .skip(skip)
//           .limit(limit),
//         Lead.countDocuments(filter),
//       ]);

//       res.status(200).json({
//         leads,
//         totalLeads,
//         totalPages:  Math.ceil(totalLeads / limit),
//         currentPage: page,
//       });
//     } catch (error) {
//       res.status(500).json({ message: error.message });
//     }
//   },

//   // ➡️ Get Lead by ID
//   getLeadById: async (req, res) => {
//     try {
//       const lead = await Lead.findById(req.params.id).populate(
//         "assignTo",
//         "firstName lastName email role"
//       );
//       if (!lead) return res.status(404).json({ message: "Lead not found" });
//       res.status(200).json(lead);
//     } catch (error) {
//       res.status(500).json({ message: error.message });
//     }
//   },

//   // ➡️ Update Lead
//   // ✅ KEY FIX: Compare old vs new followUpDate.
//   //    If changed → delete stale notifications + notify users via socket.
//   //    Old: 17-3-26 notification disappears immediately from frontend ✅
//   //    New: 19-3-26 notification will appear when cron fires on that date ✅
//   updateLead: async (req, res) => {
//     try {
//       const before = await Lead.findById(req.params.id).select(
//         "status assignTo leadName followUpDate attachments"
//       );
//       if (!before) return res.status(404).json({ message: "Lead not found" });

//       const patch = { ...req.body };

//       // Handle existing + new attachments
//       let existingAttachments = [];
//       if (req.body.existingAttachments) {
//         try {
//           existingAttachments = JSON.parse(req.body.existingAttachments);
//         } catch {
//           existingAttachments = [];
//         }
//       }

//       let newFiles = [];
//       if (req.files && req.files.length > 0) {
//         newFiles = req.files.map((file) => ({
//           name:       file.originalname,
//           path:       `/uploads/leads/${file.filename}`,
//           type:       file.mimetype,
//           size:       file.size,
//           uploadedAt: new Date(),
//         }));
//       }

//       patch.attachments = [...existingAttachments, ...newFiles];

//       // ── Handle followUpDate string → Date conversion ─────────────────
//       // Also track whether the date actually changed so we can clean up
//       // stale notifications only when needed
//       let followUpDateChanged = false;

//       if (
//         patch.followUpDate &&
//         patch.followUpDate !== "null" &&
//         patch.followUpDate.trim() !== ""
//       ) {
//         const newDate = new Date(patch.followUpDate);
//         const oldDate = before.followUpDate ? new Date(before.followUpDate) : null;

//         // ✅ Compare at day level — "2026-03-17" vs "2026-03-19"
//         if (!oldDate || newDate.toDateString() !== oldDate.toDateString()) {
//           followUpDateChanged = true;
//         }

//         patch.followUpDate   = newDate;
//         patch.lastReminderAt = null; // reset so cron fires again for new date

//       } else if (patch.followUpDate === "" || patch.followUpDate === "null") {
//         // User cleared the date entirely
//         if (before.followUpDate) followUpDateChanged = true;
//         patch.followUpDate = null;
//       }

//       if (patch.status && patch.status !== before.status) {
//         patch.lastReminderAt = null;
//       }

//       const updated = await Lead.findByIdAndUpdate(req.params.id, patch, {
//         new: true,
//       }).populate("assignTo", "firstName lastName email");

//       // ✅ If followUpDate changed: delete old notifications & notify via socket
//       //    Flow:
//       //      User changes 17-3-26 → 19-3-26
//       //      → deleteStaleFollowUpNotifications() runs
//       //      → DB: DELETE followup notifications for this leadId
//       //      → Socket: emit "notification_deleted" { ids } to each user
//       //      → Frontend NotificationContext removes them from state instantly
//       //      → On 19-3-26, cron fires and creates fresh notification ✅
//       if (followUpDateChanged) {
//         await deleteStaleFollowUpNotifications(req.params.id);
//       }

//       // Notify if status changed to Converted
//       if (before.status !== "Converted" && updated.status === "Converted") {
//         const userId   = updated.assignTo?._id?.toString();
//         const fullName = `${updated.assignTo?.firstName || ""} ${updated.assignTo?.lastName || ""}`.trim();

//         if (userId) {
//           notifyUser(userId, "deal:converted", {
//             leadId:   updated._id,
//             leadName: updated.leadName,
//             when:     new Date(),
//           });
//         }

//         if (updated.assignTo?.email) {
//           await sendEmail({
//             to:      updated.assignTo.email,
//             subject: `🎉 Deal Converted: ${updated.leadName}`,
//             text:    `Deal converted for lead ${updated.leadName}. Congrats, ${fullName}!`,
//           });
//         }
//       }

//       res.status(200).json({ message: "Lead updated successfully", lead: updated });
//     } catch (error) {
//       res.status(400).json({ message: error.message });
//     }
//   },

//   // ➡️ Delete Lead
//   deleteLead: async (req, res) => {
//     try {
//       const lead = await Lead.findByIdAndDelete(req.params.id);
//       if (!lead) return res.status(404).json({ message: "Lead not found" });
//       res.status(200).json({ message: "Lead deleted successfully" });
//     } catch (error) {
//       res.status(500).json({ message: error.message });
//     }
//   },

//   // ➡️ Update Follow-Up Date (dedicated endpoint)
//   // ✅ ALSO fixed — same stale notification cleanup
//   updateFollowUpDate: async (req, res) => {
//     try {
//       const { followUpDate } = req.body;
//       if (!followUpDate)
//         return res.status(400).json({ message: "followUpDate required" });

//       // Read old date before updating
//       const before = await Lead.findById(req.params.id).select("followUpDate");
//       if (!before) return res.status(404).json({ message: "Lead not found" });

//       const newDate    = new Date(followUpDate);
//       const oldDate    = before.followUpDate ? new Date(before.followUpDate) : null;
//       const dateChanged = !oldDate || newDate.toDateString() !== oldDate.toDateString();

//       const lead = await Lead.findByIdAndUpdate(
//         req.params.id,
//         { followUpDate, lastReminderAt: null },
//         { new: true }
//       ).populate("assignTo", "firstName lastName email");

//       if (!lead) return res.status(404).json({ message: "Lead not found" });

//       // ✅ Delete stale notifications if date actually changed
//       if (dateChanged) {
//         await deleteStaleFollowUpNotifications(req.params.id);
//       }

//       return res.status(200).json({ message: "Follow-up date updated", lead });
//     } catch (error) {
//       return res.status(400).json({ message: error.message });
//     }
//   },

//   // ➡️ Convert Lead to Deal
//   convertLeadToDeal: async (req, res) => {
//     try {
//       const lead = await Lead.findById(req.params.id).populate("assignTo");
//       if (!lead) return res.status(404).json({ message: "Lead not found" });
//       if (lead.status === "Converted")
//         return res.status(400).json({ message: "Lead already converted" });

//       const { value, notes, currency } = req.body;

//       const numericValue    = Number(value || 0);
//       const formattedNumber = new Intl.NumberFormat("en-IN").format(numericValue);
//       const formattedValue  = `${formattedNumber} ${currency || "INR"}`;

//       const deal = new Deal({
//         leadId:      lead._id,
//         dealName:    lead.leadName,
//         assignedTo:  lead.assignTo?._id,
//         value:       formattedValue,
//         notes,
//         stage:       "Qualification",
//         email:       lead.email || "",
//         phoneNumber: lead.phoneNumber,
//         source:      lead.source,
//         destination: lead.destination,
//         duration:    lead.duration,
//         requirement: lead.requirement,
//         country:     lead.country,
//         address:     lead.address,
//         attachments: lead.attachments || [],
//         followUpDate:          lead.followUpDate,
//         reminderSentAt:        lead.lastReminderAt,
//         followUpStatus:        lead.followUpStatus || "Pending",
//         followUpFrequencyDays: lead.followUpFrequencyDays || null,
//       });

//       await deal.save();
//       await Lead.findByIdAndDelete(req.params.id);

//       const userId = lead.assignTo?._id?.toString();
//       if (userId) {
//         notifyUser(userId, "deal:created", {
//           dealId:   deal._id,
//           dealName: deal.dealName,
//         });
//       }

//       res.status(200).json({ message: "Lead converted to deal", deal });
//     } catch (error) {
//       console.error("Error converting lead to deal:", error);
//       res.status(500).json({ message: error.message });
//     }
//   },




//   // ➡️ Get Recent Leads (last 5)
//   getRecentLeads: async (req, res) => {
//     try {
//       const query =
//         req.user.role.name === "Admin" ? {} : { assignTo: req.user._id };

//       const leads = await Lead.find(query)
//         .sort({ createdAt: -1 })
//         .limit(5)
//         .populate("assignTo", "firstName lastName email");

//       res.status(200).json(leads);
//     } catch (error) {
//       res.status(500).json({ message: error.message });
//     }
//   },

//   // ➡️ Get Pending Leads (not converted)
//   getPendingLeads: async (req, res) => {
//     try {
//       const query =
//         req.user.role.name === "Admin"
//           ? { status: { $ne: "Converted" } }
//           : { status: { $ne: "Converted" }, assignTo: req.user._id };

//       const leads = await Lead.find(query)
//         .sort({ createdAt: -1 })
//         .limit(5)
//         .populate("assignTo", "firstName lastName email");

//       res.status(200).json(leads);
//     } catch (error) {
//       res.status(500).json({ message: error.message });
//     }
//   },

//   // ➡️ Update Lead Status
//   updateLeadStatus: async (req, res) => {
//     try {
//       const { status } = req.body;
//       if (!status) return res.status(400).json({ message: "Status required" });

//       const lead = await Lead.findById(req.params.id).populate("assignTo");
//       if (!lead) return res.status(404).json({ message: "Lead not found" });

//       const oldStatus = lead.status;
//       lead.status     = status;

//       if (status !== oldStatus) lead.lastReminderAt = null;
//       await lead.save();

//       if (oldStatus !== "Converted" && status === "Converted") {
//         const userId   = lead.assignTo?._id?.toString();
//         const fullName = `${lead.assignTo?.firstName || ""} ${lead.assignTo?.lastName || ""}`.trim();

//         if (userId) {
//           notifyUser(userId, "deal:converted", {
//             leadId:   lead._id,
//             leadName: lead.leadName,
//             when:     new Date(),
//           });
//         }

//         if (lead.assignTo?.email) {
//           await sendEmail({
//             to:      lead.assignTo.email,
//             subject: `🎉 Deal Converted: ${lead.leadName}`,
//             text:    `Deal converted for lead ${lead.leadName}. Congrats, ${fullName}!`,
//           });
//         }
//       }

//       res.status(200).json({ message: "Lead status updated successfully", lead });
//     } catch (error) {
//       res.status(500).json({ message: error.message });
//     }
//   },
// };//original



import dayjs from "dayjs";
import Lead from "../models/leads.model.js";
import userModel from "../models/user.model.js";
import sendEmail from "../services/email.js";
import { notifyUser } from "../realtime/socket.js";
import Deal from "../models/deals.model.js";
import Notification from "../models/notification.model.js";

/* ── Round-robin sales user picker ── */
const pickNextSalesUser = async () => {
  const users = await userModel
    .find({}).populate("role", "name")
    .select("_id firstName lastName role createdAt")
    .sort({ createdAt: 1, _id: 1 }).lean();

  const salesUsers = users.filter((u) => {
    const roleName = typeof u.role === "string" ? u.role : u.role?.name || u.role?.roleName || "";
    return String(roleName).toLowerCase() === "sales";
  });

  if (!salesUsers.length) return null;

  const lastLead = await Lead.findOne({ assignTo: { $ne: null } })
    .sort({ createdAt: -1, _id: -1 }).select("assignTo").lean();

  if (!lastLead?.assignTo) return salesUsers[0]._id;
  const lastIdx = salesUsers.findIndex((u) => u._id.toString() === lastLead.assignTo.toString());
  const nextIdx = lastIdx === -1 ? 0 : (lastIdx + 1) % salesUsers.length;
  return salesUsers[nextIdx]._id;
};

/* ── Delete stale follow-up notifications when date changes ── */
const deleteStaleFollowUpNotifications = async (leadId) => {
  try {
    const oldNotifications = await Notification.find({
      "meta.leadId": String(leadId), type: "followup",
    }).lean();

    if (oldNotifications.length === 0) return;

    await Notification.deleteMany({ "meta.leadId": String(leadId), type: "followup" });

    const userNotifMap = new Map();
    oldNotifications.forEach((n) => {
      const uid = String(n.userId);
      if (!userNotifMap.has(uid)) userNotifMap.set(uid, []);
      userNotifMap.get(uid).push(String(n._id));
    });

    for (const [userId, ids] of userNotifMap.entries()) {
      notifyUser(userId, "notification_deleted", { ids });
    }

    console.log(`🗑️ Deleted ${oldNotifications.length} stale followup notification(s) for lead ${leadId}`);
  } catch (err) {
    console.error("❌ Error deleting stale notifications:", err.message);
  }
};

/* ── Cost parser helper ── */
const parseCostField = (v) => {
  const n = parseFloat(String(v || "0").replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
};

export default {

  /* ── Create Lead ── */
  createLead: async (req, res) => {
    try {
      const { leadName, destination, phoneNumber } = req.body;
      if (!leadName || !destination || !phoneNumber)
        return res.status(400).json({ message: "Lead name, destination, and phone number are required" });

      const data = { ...req.body };

      if (req.files?.length > 0) {
        data.attachments = req.files.map((file) => ({
          name: file.originalname, path: `uploads/leads/${file.filename}`,
          type: file.mimetype, size: file.size, uploadedAt: new Date(),
        }));
      }

      const autoAssignee = await pickNextSalesUser();
      data.assignTo = autoAssignee;
      if (!data.status) data.status = "Cold";

      if (data.followUpDate && data.followUpDate !== "null" && data.followUpDate.trim() !== "") {
        data.followUpDate = new Date(data.followUpDate);
      } else {
        data.followUpDate = null;
      }

      data.lastReminderAt = null;

      const lead      = new Lead(data);
      const savedLead = await lead.save();

      res.status(201).json({ message: "Lead created successfully", lead: savedLead });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  /* ── Get All Leads (paginated) ── */
  // getLeads: async (req, res) => {
  //   try {
  //     const page  = Math.max(1, parseInt(req.query.page)  || 1);
  //     const limit = Math.max(1, parseInt(req.query.limit) || 10);
  //     const skip  = (page - 1) * limit;

  //     const filter = req.user.role.name === "Admin" ? {} : { assignTo: req.user._id };

  //     const [leads, totalLeads] = await Promise.all([
  //       Lead.find(filter).populate("assignTo", "firstName lastName email role")
  //         .sort({ createdAt: -1 }).skip(skip).limit(limit),
  //       Lead.countDocuments(filter),
  //     ]);

  //     res.status(200).json({ leads, totalLeads, totalPages: Math.ceil(totalLeads / limit), currentPage: page });
  //   } catch (error) {
  //     res.status(500).json({ message: error.message });
  //   }
  // },

getLeads: async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    const roleName = req.user.role.name?.toLowerCase();

    // ----- Operations: return both leads and deals assigned to the user -----
    if (roleName === "operations") {
      const assignedTo = req.user._id;

      // Fetch leads
      const leads = await Lead.find({ assignTo: assignedTo })
        .populate("assignTo", "firstName lastName email role")
        .sort({ createdAt: -1 })
        .lean();

      // Fetch deals
      const deals = await Deal.find({ assignedTo: assignedTo })
        .populate("assignedTo", "firstName lastName email role")
        .sort({ createdAt: -1 })
        .lean();

      // Transform deals to match the lead structure
      const transformedDeals = deals.map(deal => ({
        _id: deal._id,
        leadName: deal.dealName,
        phoneNumber: deal.phoneNumber,
        destination: deal.destination,
        country: deal.country,
        source: deal.source,
        status: "Deal",               // special status for deals
        assignTo: deal.assignedTo,
        createdAt: deal.createdAt,
        followUpDate: deal.followUpDate,
        email: deal.email,
        _type: "deal",                // flag to identify deals in the frontend
        // keep original deal fields if needed
        ...deal,
      }));

      // Combine and sort by creation date
      const combined = [...leads, ...transformedDeals].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );

      const total = combined.length;
      const paginated = combined.slice(skip, skip + limit);

      return res.status(200).json({
        leads: paginated,
        totalLeads: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      });
    }

    // ----- Admin or Sales: return only leads -----
    const filter = roleName === "admin" ? {} : { assignTo: req.user._id };

    const [leads, totalLeads] = await Promise.all([
      Lead.find(filter)
        .populate("assignTo", "firstName lastName email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Lead.countDocuments(filter),
    ]);

    res.status(200).json({
      leads,
      totalLeads,
      totalPages: Math.ceil(totalLeads / limit),
      currentPage: page,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
},

  /* ── Get Lead by ID ── */
  getLeadById: async (req, res) => {
    try {
      const lead = await Lead.findById(req.params.id).populate("assignTo", "firstName lastName email role");
      if (!lead) return res.status(404).json({ message: "Lead not found" });
      res.status(200).json(lead);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  /* ── Update Lead ── */
  updateLead: async (req, res) => {
    try {
      const before = await Lead.findById(req.params.id).select("status assignTo leadName followUpDate attachments");
      if (!before) return res.status(404).json({ message: "Lead not found" });

      const patch = { ...req.body };

      let existingAttachments = [];
      if (req.body.existingAttachments) {
        try { existingAttachments = JSON.parse(req.body.existingAttachments); }
        catch { existingAttachments = []; }
      }

      let newFiles = [];
      if (req.files && req.files.length > 0) {
        newFiles = req.files.map((file) => ({
          name: file.originalname, path: `/uploads/leads/${file.filename}`,
          type: file.mimetype, size: file.size, uploadedAt: new Date(),
        }));
      }

      patch.attachments = [...existingAttachments, ...newFiles];

      let followUpDateChanged = false;

      if (patch.followUpDate && patch.followUpDate !== "null" && patch.followUpDate.trim() !== "") {
        const newDate = new Date(patch.followUpDate);
        const oldDate = before.followUpDate ? new Date(before.followUpDate) : null;
        if (!oldDate || newDate.toDateString() !== oldDate.toDateString()) followUpDateChanged = true;
        patch.followUpDate   = newDate;
        patch.lastReminderAt = null;
      } else if (patch.followUpDate === "" || patch.followUpDate === "null") {
        if (before.followUpDate) followUpDateChanged = true;
        patch.followUpDate = null;
      }

      if (patch.status && patch.status !== before.status) patch.lastReminderAt = null;

      const updated = await Lead.findByIdAndUpdate(req.params.id, patch, { new: true })
        .populate("assignTo", "firstName lastName email");

      if (followUpDateChanged) await deleteStaleFollowUpNotifications(req.params.id);

      if (before.status !== "Converted" && updated.status === "Converted") {
        const userId   = updated.assignTo?._id?.toString();
        const fullName = `${updated.assignTo?.firstName || ""} ${updated.assignTo?.lastName || ""}`.trim();
        if (userId) notifyUser(userId, "deal:converted", { leadId: updated._id, leadName: updated.leadName, when: new Date() });
        if (updated.assignTo?.email) {
          await sendEmail({ to: updated.assignTo.email, subject: `🎉 Deal Converted: ${updated.leadName}`, text: `Deal converted for lead ${updated.leadName}. Congrats, ${fullName}!` });
        }
      }

      res.status(200).json({ message: "Lead updated successfully", lead: updated });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  /* ── Delete Lead ── */
  deleteLead: async (req, res) => {
    try {
      const lead = await Lead.findByIdAndDelete(req.params.id);
      if (!lead) return res.status(404).json({ message: "Lead not found" });
      res.status(200).json({ message: "Lead deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  /* ── Update Follow-Up Date ── */
  updateFollowUpDate: async (req, res) => {
    try {
      const { followUpDate } = req.body;
      if (!followUpDate) return res.status(400).json({ message: "followUpDate required" });

      const before = await Lead.findById(req.params.id).select("followUpDate");
      if (!before) return res.status(404).json({ message: "Lead not found" });

      const newDate     = new Date(followUpDate);
      const oldDate     = before.followUpDate ? new Date(before.followUpDate) : null;
      const dateChanged = !oldDate || newDate.toDateString() !== oldDate.toDateString();

      const lead = await Lead.findByIdAndUpdate(
        req.params.id, { followUpDate, lastReminderAt: null }, { new: true }
      ).populate("assignTo", "firstName lastName email");

      if (!lead) return res.status(404).json({ message: "Lead not found" });
      if (dateChanged) await deleteStaleFollowUpNotifications(req.params.id);

      return res.status(200).json({ message: "Follow-up date updated", lead });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },

  /* ══════════════════════════════════════════════════════════
     Convert Lead to Deal
     Now accepts cost fields from the convert modal:
       purchasingLandCost, purchasingTicketCost,
       sellingLandCost,    sellingTicketCost
     ══════════════════════════════════════════════════════════ */
  convertLeadToDeal: async (req, res) => {
    try {
      const lead = await Lead.findById(req.params.id).populate("assignTo");
      if (!lead) return res.status(404).json({ message: "Lead not found" });
      if (lead.status === "Converted")
        return res.status(400).json({ message: "Lead already converted" });

      const {
        value, notes, currency,
        // ── NEW cost fields ──────────────────────────────────────
        purchasingLandCost, purchasingTicketCost,
        sellingLandCost,    sellingTicketCost,
      } = req.body;

      const numericValue    = Number(value || 0);
      const formattedNumber = new Intl.NumberFormat("en-IN").format(numericValue);
      const formattedValue  = `${formattedNumber} ${currency || "INR"}`;

      /* Parse cost fields */
      const pLand   = parseCostField(purchasingLandCost);
      const pTicket = parseCostField(purchasingTicketCost);
      const sLand   = parseCostField(sellingLandCost);
      const sTicket = parseCostField(sellingTicketCost);

      const deal = new Deal({
        leadId:      lead._id,
        dealName:    lead.leadName,
        assignedTo:  lead.assignTo?._id,
        value:       formattedValue,
        notes,
        stage:       "Qualification",
        email:       lead.email || "",
        phoneNumber: lead.phoneNumber,
        source:      lead.source,
        destination: lead.destination,
        duration:    lead.duration,
        requirement: lead.requirement,
        country:     lead.country,
        address:     lead.address,
        attachments: lead.attachments || [],
        followUpDate:          lead.followUpDate,
        reminderSentAt:        lead.lastReminderAt,
        followUpStatus:        lead.followUpStatus || "Pending",
        followUpFrequencyDays: lead.followUpFrequencyDays || null,
        // ── Cost fields ──────────────────────────────────────────
        purchasingLandCost:   pLand,
        purchasingTicketCost: pTicket,
        sellingLandCost:      sLand,
        sellingTicketCost:    sTicket,
        totalPurchasingCost:  pLand   + pTicket,
        totalSellingCost:     sLand   + sTicket,
        profit:               (sLand  + sTicket) - (pLand + pTicket),
      });

      await deal.save();
      await Lead.findByIdAndDelete(req.params.id);

      const userId = lead.assignTo?._id?.toString();
      if (userId) notifyUser(userId, "deal:created", { dealId: deal._id, dealName: deal.dealName });

      res.status(200).json({ message: "Lead converted to deal", deal });
    } catch (error) {
      console.error("Error converting lead to deal:", error);
      res.status(500).json({ message: error.message });
    }
  },

  /* ── Get Recent Leads (last 5) ── */
  getRecentLeads: async (req, res) => {
    try {
      const query = req.user.role.name === "Admin" ? {} : { assignTo: req.user._id };
      const leads = await Lead.find(query).sort({ createdAt: -1 }).limit(5)
        .populate("assignTo", "firstName lastName email");
      res.status(200).json(leads);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  /* ── Get Pending Leads (not converted) ── */
  getPendingLeads: async (req, res) => {
    try {
      const query = req.user.role.name === "Admin"
        ? { status: { $ne: "Converted" } }
        : { status: { $ne: "Converted" }, assignTo: req.user._id };
      const leads = await Lead.find(query).sort({ createdAt: -1 }).limit(5)
        .populate("assignTo", "firstName lastName email");
      res.status(200).json(leads);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  /* ── Update Lead Status ── */
  updateLeadStatus: async (req, res) => {
    try {
      const { status } = req.body;
      if (!status) return res.status(400).json({ message: "Status required" });

      const lead = await Lead.findById(req.params.id).populate("assignTo");
      if (!lead) return res.status(404).json({ message: "Lead not found" });

      const oldStatus = lead.status;
      lead.status     = status;
      if (status !== oldStatus) lead.lastReminderAt = null;
      await lead.save();

      if (oldStatus !== "Converted" && status === "Converted") {
        const userId   = lead.assignTo?._id?.toString();
        const fullName = `${lead.assignTo?.firstName || ""} ${lead.assignTo?.lastName || ""}`.trim();
        if (userId) notifyUser(userId, "deal:converted", { leadId: lead._id, leadName: lead.leadName, when: new Date() });
        if (lead.assignTo?.email) {
          await sendEmail({ to: lead.assignTo.email, subject: `🎉 Deal Converted: ${lead.leadName}`, text: `Deal converted for lead ${lead.leadName}. Congrats, ${fullName}!` });
        }
      }

      res.status(200).json({ message: "Lead status updated successfully", lead });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
};