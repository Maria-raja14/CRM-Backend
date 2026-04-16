// import dayjs from "dayjs";
// import Lead from "../models/leads.model.js";
// import userModel from "../models/user.model.js";
// import sendEmail from "../services/email.js";
// import { notifyUser } from "../realtime/socket.js";
// import Deal from "../models/deals.model.js";
// import Notification from "../models/notification.model.js";

// /* ── Round-robin sales user picker ── */
// const pickNextSalesUser = async () => {
//   const users = await userModel
//     .find({}).populate("role", "name")
//     .select("_id firstName lastName role createdAt")
//     .sort({ createdAt: 1, _id: 1 }).lean();

//   const salesUsers = users.filter((u) => {
//     const roleName = typeof u.role === "string" ? u.role : u.role?.name || u.role?.roleName || "";
//     return String(roleName).toLowerCase() === "sales";
//   });

//   if (!salesUsers.length) return null;

//   const lastLead = await Lead.findOne({ assignTo: { $ne: null } })
//     .sort({ createdAt: -1, _id: -1 }).select("assignTo").lean();

//   if (!lastLead?.assignTo) return salesUsers[0]._id;
//   const lastIdx = salesUsers.findIndex((u) => u._id.toString() === lastLead.assignTo.toString());
//   const nextIdx = lastIdx === -1 ? 0 : (lastIdx + 1) % salesUsers.length;
//   return salesUsers[nextIdx]._id;
// };

// /* ── Delete stale follow-up notifications ── */
// const deleteStaleFollowUpNotifications = async (leadId) => {
//   try {
//     const oldNotifications = await Notification.find({
//       "meta.leadId": String(leadId), type: "followup",
//     }).lean();
//     if (oldNotifications.length === 0) return;
//     await Notification.deleteMany({ "meta.leadId": String(leadId), type: "followup" });
//     const userNotifMap = new Map();
//     oldNotifications.forEach((n) => {
//       const uid = String(n.userId);
//       if (!userNotifMap.has(uid)) userNotifMap.set(uid, []);
//       userNotifMap.get(uid).push(String(n._id));
//     });
//     for (const [userId, ids] of userNotifMap.entries()) notifyUser(userId, "notification_deleted", { ids });
//   } catch (err) {
//     console.error("Error deleting stale notifications:", err.message);
//   }
// };

// /* ── Cost parser helper ── */
// const parseCostField = (v) => {
//   const n = parseFloat(String(v || "0").replace(/,/g, ""));
//   return isNaN(n) ? 0 : n;
// };

// export default {

//   /* ── Create Lead ── */
//   createLead: async (req, res) => {
//     try {
//       const { leadName, destination, phoneNumber, assignTo } = req.body;
//       if (!leadName || !destination || !phoneNumber)
//         return res.status(400).json({ message: "Lead name, destination, and phone number are required" });

//       const data = { ...req.body };

//       if (req.files?.length > 0) {
//         data.attachments = req.files.map((file) => ({
//           name: file.originalname, path: `uploads/leads/${file.filename}`,
//           type: file.mimetype, size: file.size, uploadedAt: new Date(),
//         }));
//       }

//       let finalAssignTo = assignTo;
//       if (!finalAssignTo) {
//         const userRole = req.user?.role?.name?.toLowerCase();
//         if (userRole === "sales") finalAssignTo = req.user._id;
//         else finalAssignTo = await pickNextSalesUser();
//       }
//       data.assignTo = finalAssignTo;
//       if (!data.status) data.status = "Cold";

//       if (data.followUpDate && data.followUpDate !== "null" && data.followUpDate.trim() !== "") {
//         data.followUpDate = new Date(data.followUpDate);
//       } else {
//         data.followUpDate = null;
//       }

//       // Handle travelDate
//       if (data.travelDate && data.travelDate !== "null" && String(data.travelDate).trim() !== "") {
//         data.travelDate = new Date(data.travelDate);
//       } else {
//         data.travelDate = null;
//       }

//       // Handle noOfTravellers
//       if (data.noOfTravellers !== undefined && data.noOfTravellers !== "" && data.noOfTravellers !== null) {
//         data.noOfTravellers = parseInt(data.noOfTravellers, 10) || null;
//       } else {
//         data.noOfTravellers = null;
//       }

//       data.lastReminderAt = null;

//       const lead      = new Lead(data);
//       const savedLead = await lead.save();

//       console.log(`✅ [createLead] New lead created: ${savedLead._id} — "${savedLead.leadName}" | source: ${savedLead.source || "Manual"}`);

//       res.status(201).json({ message: "Lead created successfully", lead: savedLead });
//     } catch (error) {
//       console.error("❌ [createLead] Error:", error.message);
//       res.status(400).json({ message: error.message });
//     }
//   },

//   /* ── Get All Leads (paginated) ── */
//   getLeads: async (req, res) => {
//     try {
//       const page  = Math.max(1, parseInt(req.query.page)  || 1);
//       const limit = Math.max(1, parseInt(req.query.limit) || 10);
//       const skip  = (page - 1) * limit;

//       const roleName = req.user.role.name?.toLowerCase();

//       console.log(`📋 [getLeads] Request by role="${roleName}" | page=${page} | limit=${limit} | filters:`, {
//         search:   req.query.search   || null,
//         status:   req.query.status   || null,
//         source:   req.query.source   || null,
//         assignee: req.query.assignee || null,
//       });

//       /* ── Operations role: combined leads + deals ── */
//       if (roleName === "operations") {
//         const assignedTo = req.user._id;

//         const leads = await Lead.find({ assignTo: assignedTo })
//           .populate("assignTo", "firstName lastName email role")
//           .sort({ createdAt: -1 }).lean();

//         const deals = await Deal.find({ assignedTo: assignedTo })
//           .populate("assignedTo", "firstName lastName email role")
//           .sort({ createdAt: -1 }).lean();

//         const transformedDeals = deals.map((deal) => ({
//           _id: deal._id,
//           leadName: deal.dealName,
//           phoneNumber: deal.phoneNumber,
//           destination: deal.destination,
//           country: deal.country,
//           source: deal.source,
//           status: "Deal",
//           assignTo: deal.assignedTo,
//           createdAt: deal.createdAt,
//           followUpDate: deal.followUpDate,
//           email: deal.email,
//           noOfTravellers: deal.noOfTravellers,
//           travelDate: deal.travelDate,
//           _type: "deal",
//           ...deal,
//         }));

//         const combined  = [...leads, ...transformedDeals].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
//         const total     = combined.length;
//         const paginated = combined.slice(skip, skip + limit);

//         console.log(`📋 [getLeads] Operations view — leads: ${leads.length}, deals: ${deals.length}, total: ${total}`);

//         return res.status(200).json({
//           leads: paginated,
//           totalLeads: total,
//           totalPages: Math.ceil(total / limit),
//           currentPage: page,
//         });
//       }

//       /* ── Admin / Sales role ── */
//       // Build filter with search support
//       const filter = roleName === "admin" ? {} : { assignTo: req.user._id };

//       if (req.query.search) {
//         const s = req.query.search;
//         filter.$or = [
//           { leadName:    { $regex: s, $options: "i" } },
//           { email:       { $regex: s, $options: "i" } },
//           { phoneNumber: { $regex: s, $options: "i" } },
//           { destination: { $regex: s, $options: "i" } },
//           // ✅ Also search by phone without spaces/formatting
//           { phoneNumber: { $regex: s.replace(/\s+/g, ""), $options: "i" } },
//         ];
//       }

//       if (req.query.status)   filter.status = req.query.status;
//       if (req.query.source)   filter.source = req.query.source;

//       // Assignee filter: match by first name in populated field — use lookup approach
//       let assigneeId = null;
//       if (req.query.assignee) {
//         const matchedUser = await userModel.findOne({
//           $or: [
//             { firstName: { $regex: req.query.assignee, $options: "i" } },
//             { lastName:  { $regex: req.query.assignee, $options: "i" } },
//           ]
//         }).select("_id").lean();
//         if (matchedUser) {
//           filter.assignTo = matchedUser._id;
//         } else {
//           // no user matched — return empty
//           console.log(`📋 [getLeads] No user found for assignee filter: "${req.query.assignee}"`);
//           return res.status(200).json({ leads: [], totalLeads: 0, totalPages: 0, currentPage: page });
//         }
//       }

//       const [leads, totalLeads] = await Promise.all([
//         Lead.find(filter)
//           .populate("assignTo", "firstName lastName email role")
//           .sort({ createdAt: -1 })
//           .skip(skip)
//           .limit(limit)
//           .lean(),
//         Lead.countDocuments(filter),
//       ]);

//       // ✅ Console: breakdown by source
//       const facebookLeads = leads.filter(l => l.source === "Facebook");
//       const manualLeads   = leads.filter(l => l.source !== "Facebook");
//       console.log(`📋 [getLeads] Fetched ${leads.length} leads (page ${page}/${Math.ceil(totalLeads / limit)}) | Manual: ${manualLeads.length}, Facebook: ${facebookLeads.length}, Total DB: ${totalLeads}`);

//       if (facebookLeads.length > 0) {
//         console.log("📘 [getLeads] Facebook leads in this page:", facebookLeads.map(l => ({
//           id: l._id, name: l.leadName, phone: l.phoneNumber, status: l.status, facebookLeadId: l.facebookLeadId
//         })));
//       }

//       res.status(200).json({
//         leads,
//         totalLeads,
//         totalPages: Math.ceil(totalLeads / limit),
//         currentPage: page,
//       });
//     } catch (error) {
//       console.error("❌ [getLeads] Error:", error.message);
//       res.status(500).json({ message: error.message });
//     }
//   },

//   /* ── Get Lead by ID ── */
//   getLeadById: async (req, res) => {
//     try {
//       const lead = await Lead.findById(req.params.id).populate("assignTo", "firstName lastName email role");
//       if (!lead) return res.status(404).json({ message: "Lead not found" });

//       console.log(`🔍 [getLeadById] Lead fetched: ${lead._id} — "${lead.leadName}" | source: ${lead.source}`);

//       res.status(200).json(lead);
//     } catch (error) {
//       console.error("❌ [getLeadById] Error:", error.message);
//       res.status(500).json({ message: error.message });
//     }
//   },

//   /* ── Update Lead ── */
//   updateLead: async (req, res) => {
//     try {
//       const before = await Lead.findById(req.params.id).select("status assignTo leadName followUpDate attachments");
//       if (!before) return res.status(404).json({ message: "Lead not found" });

//       const patch = { ...req.body };

//       let existingAttachments = [];
//       if (req.body.existingAttachments) {
//         try { existingAttachments = JSON.parse(req.body.existingAttachments); }
//         catch { existingAttachments = []; }
//       }

//       let newFiles = [];
//       if (req.files && req.files.length > 0) {
//         newFiles = req.files.map((file) => ({
//           name: file.originalname, path: `/uploads/leads/${file.filename}`,
//           type: file.mimetype, size: file.size, uploadedAt: new Date(),
//         }));
//       }

//       patch.attachments = [...existingAttachments, ...newFiles];

//       // Handle travelDate
//       if (patch.travelDate && patch.travelDate !== "null" && String(patch.travelDate).trim() !== "") {
//         patch.travelDate = new Date(patch.travelDate);
//       } else if (patch.travelDate === "" || patch.travelDate === "null") {
//         patch.travelDate = null;
//       }

//       // Handle noOfTravellers
//       if (patch.noOfTravellers !== undefined && patch.noOfTravellers !== "" && patch.noOfTravellers !== null) {
//         patch.noOfTravellers = parseInt(patch.noOfTravellers, 10) || null;
//       }

//       let followUpDateChanged = false;
//       if (patch.followUpDate && patch.followUpDate !== "null" && patch.followUpDate.trim() !== "") {
//         const newDate = new Date(patch.followUpDate);
//         const oldDate = before.followUpDate ? new Date(before.followUpDate) : null;
//         if (!oldDate || newDate.toDateString() !== oldDate.toDateString()) followUpDateChanged = true;
//         patch.followUpDate   = newDate;
//         patch.lastReminderAt = null;
//       } else if (patch.followUpDate === "" || patch.followUpDate === "null") {
//         if (before.followUpDate) followUpDateChanged = true;
//         patch.followUpDate = null;
//       }

//       if (patch.status && patch.status !== before.status) patch.lastReminderAt = null;

//       const updated = await Lead.findByIdAndUpdate(req.params.id, patch, { new: true })
//         .populate("assignTo", "firstName lastName email");

//       if (followUpDateChanged) await deleteStaleFollowUpNotifications(req.params.id);

//       console.log(`✏️  [updateLead] Lead updated: ${updated._id} — "${updated.leadName}" | status: ${before.status} → ${updated.status}`);

//       if (before.status !== "Converted" && updated.status === "Converted") {
//         const userId   = updated.assignTo?._id?.toString();
//         const fullName = `${updated.assignTo?.firstName || ""} ${updated.assignTo?.lastName || ""}`.trim();
//         if (userId) notifyUser(userId, "deal:converted", { leadId: updated._id, leadName: updated.leadName, when: new Date() });
//         if (updated.assignTo?.email) {
//           await sendEmail({ to: updated.assignTo.email, subject: `🎉 Deal Converted: ${updated.leadName}`, text: `Deal converted for lead ${updated.leadName}. Congrats, ${fullName}!` });
//         }
//       }

//       res.status(200).json({ message: "Lead updated successfully", lead: updated });
//     } catch (error) {
//       console.error("❌ [updateLead] Error:", error.message);
//       res.status(400).json({ message: error.message });
//     }
//   },

//   /* ── Delete Lead ── */
//   deleteLead: async (req, res) => {
//     try {
//       const lead = await Lead.findByIdAndDelete(req.params.id);
//       if (!lead) return res.status(404).json({ message: "Lead not found" });

//       console.log(`🗑️  [deleteLead] Lead deleted: ${req.params.id} — "${lead.leadName}"`);

//       res.status(200).json({ message: "Lead deleted successfully" });
//     } catch (error) {
//       console.error("❌ [deleteLead] Error:", error.message);
//       res.status(500).json({ message: error.message });
//     }
//   },

//   /* ── Update Follow-Up Date ── */
//   updateFollowUpDate: async (req, res) => {
//     try {
//       const { followUpDate } = req.body;
//       if (!followUpDate) return res.status(400).json({ message: "followUpDate required" });

//       const before = await Lead.findById(req.params.id).select("followUpDate");
//       if (!before) return res.status(404).json({ message: "Lead not found" });

//       const newDate     = new Date(followUpDate);
//       const oldDate     = before.followUpDate ? new Date(before.followUpDate) : null;
//       const dateChanged = !oldDate || newDate.toDateString() !== oldDate.toDateString();

//       const lead = await Lead.findByIdAndUpdate(
//         req.params.id, { followUpDate, lastReminderAt: null }, { new: true }
//       ).populate("assignTo", "firstName lastName email");

//       if (!lead) return res.status(404).json({ message: "Lead not found" });
//       if (dateChanged) await deleteStaleFollowUpNotifications(req.params.id);

//       console.log(`📅 [updateFollowUpDate] Lead: ${req.params.id} | followUp: ${followUpDate}`);

//       return res.status(200).json({ message: "Follow-up date updated", lead });
//     } catch (error) {
//       console.error("❌ [updateFollowUpDate] Error:", error.message);
//       return res.status(400).json({ message: error.message });
//     }
//   },

//   /* ── Convert Lead to Deal ── */
//   convertLeadToDeal: async (req, res) => {
//     try {
//       const lead = await Lead.findById(req.params.id).populate("assignTo");
//       if (!lead) return res.status(404).json({ message: "Lead not found" });
//       if (lead.status === "Converted")
//         return res.status(400).json({ message: "Lead already converted" });

//       const {
//         value, notes, currency,
//         purchasingLandCost, purchasingTicketCost,
//         sellingLandCost,    sellingTicketCost,
//         noOfTravellers,     travelDate,
//       } = req.body;

//       const numericValue    = Number(value || 0);
//       const formattedNumber = new Intl.NumberFormat("en-IN").format(numericValue);
//       const formattedValue  = `${formattedNumber} ${currency || "INR"}`;

//       const pLand   = parseCostField(purchasingLandCost);
//       const pTicket = parseCostField(purchasingTicketCost);
//       const sLand   = parseCostField(sellingLandCost);
//       const sTicket = parseCostField(sellingTicketCost);

//       const deal = new Deal({
//         leadId:      lead._id,
//         dealName:    lead.leadName,
//         assignedTo:  lead.assignTo?._id,
//         value:       formattedValue,
//         notes,
//         stage:       "Qualification",
//         email:       lead.email       || "",
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
//         purchasingLandCost:   pLand,
//         purchasingTicketCost: pTicket,
//         sellingLandCost:      sLand,
//         sellingTicketCost:    sTicket,
//         totalPurchasingCost:  pLand   + pTicket,
//         totalSellingCost:     sLand   + sTicket,
//         profit:               (sLand  + sTicket) - (pLand + pTicket),
//         noOfTravellers: noOfTravellers ? parseInt(noOfTravellers, 10) || null : (lead.noOfTravellers || null),
//         travelDate:     travelDate ? new Date(travelDate) : (lead.travelDate || null),
//       });

//       await deal.save();
//       await Lead.findByIdAndDelete(req.params.id);

//       console.log(`🤝 [convertLeadToDeal] Lead "${lead.leadName}" (${lead._id}) → Deal "${deal._id}" | source: ${lead.source}`);

//       const userId = lead.assignTo?._id?.toString();
//       if (userId) notifyUser(userId, "deal:created", { dealId: deal._id, dealName: deal.dealName });

//       res.status(200).json({ message: "Lead converted to deal", deal });
//     } catch (error) {
//       console.error("❌ [convertLeadToDeal] Error:", error.message, error.stack);
//       res.status(500).json({ message: error.message });
//     }
//   },

//   /* ── Get Recent Leads (last 5) ── */
//   getRecentLeads: async (req, res) => {
//     try {
//       const query = req.user.role.name === "Admin" ? {} : { assignTo: req.user._id };
//       const leads = await Lead.find(query).sort({ createdAt: -1 }).limit(5)
//         .populate("assignTo", "firstName lastName email");
//       res.status(200).json(leads);
//     } catch (error) {
//       console.error("❌ [getRecentLeads] Error:", error.message);
//       res.status(500).json({ message: error.message });
//     }
//   },

//   /* ── Get Pending Leads (not converted) ── */
//   getPendingLeads: async (req, res) => {
//     try {
//       const query = req.user.role.name === "Admin"
//         ? { status: { $ne: "Converted" } }
//         : { status: { $ne: "Converted" }, assignTo: req.user._id };
//       const leads = await Lead.find(query).sort({ createdAt: -1 }).limit(5)
//         .populate("assignTo", "firstName lastName email");
//       res.status(200).json(leads);
//     } catch (error) {
//       console.error("❌ [getPendingLeads] Error:", error.message);
//       res.status(500).json({ message: error.message });
//     }
//   },

//   /* ── Update Lead Status ── */
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

//       console.log(`🔄 [updateLeadStatus] Lead: ${req.params.id} | "${lead.leadName}" | ${oldStatus} → ${status}`);

//       if (oldStatus !== "Converted" && status === "Converted") {
//         const userId   = lead.assignTo?._id?.toString();
//         const fullName = `${lead.assignTo?.firstName || ""} ${lead.assignTo?.lastName || ""}`.trim();
//         if (userId) notifyUser(userId, "deal:converted", { leadId: lead._id, leadName: lead.leadName, when: new Date() });
//         if (lead.assignTo?.email) {
//           await sendEmail({ to: lead.assignTo.email, subject: `🎉 Deal Converted: ${lead.leadName}`, text: `Deal converted for lead ${lead.leadName}. Congrats, ${fullName}!` });
//         }
//       }

//       res.status(200).json({ message: "Lead status updated successfully", lead });
//     } catch (error) {
//       console.error("❌ [updateLeadStatus] Error:", error.message);
//       res.status(500).json({ message: error.message });
//     }
//   },
// };//all work correctly....


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

/* ── Delete stale follow-up notifications ── */
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
    for (const [userId, ids] of userNotifMap.entries()) notifyUser(userId, "notification_deleted", { ids });
  } catch (err) {
    console.error("Error deleting stale notifications:", err.message);
  }
};

/* ── Cost parser helper ── */
const parseCostField = (v) => {
  const n = parseFloat(String(v || "0").replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
};

/* ── Parse integer traveller field ── */
const parseTravellerField = (v) => {
  if (v === undefined || v === "" || v === null) return null;
  const n = parseInt(v, 10);
  return isNaN(n) ? null : n;
};

export default {

  /* ── Create Lead ── */
  createLead: async (req, res) => {
    try {
      const { leadName, destination, phoneNumber, assignTo } = req.body;
      if (!leadName || !destination || !phoneNumber)
        return res.status(400).json({ message: "Lead name, destination, and phone number are required" });

      const data = { ...req.body };

      if (req.files?.length > 0) {
        data.attachments = req.files.map((file) => ({
          name: file.originalname, path: `uploads/leads/${file.filename}`,
          type: file.mimetype, size: file.size, uploadedAt: new Date(),
        }));
      }

      let finalAssignTo = assignTo;
      if (!finalAssignTo) {
        const userRole = req.user?.role?.name?.toLowerCase();
        if (userRole === "sales") finalAssignTo = req.user._id;
        else finalAssignTo = await pickNextSalesUser();
      }
      data.assignTo = finalAssignTo;
      if (!data.status) data.status = "Cold";

      if (data.followUpDate && data.followUpDate !== "null" && data.followUpDate.trim() !== "") {
        data.followUpDate = new Date(data.followUpDate);
      } else {
        data.followUpDate = null;
      }

      // Handle travelDate
      if (data.travelDate && data.travelDate !== "null" && String(data.travelDate).trim() !== "") {
        data.travelDate = new Date(data.travelDate);
      } else {
        data.travelDate = null;
      }

      // Handle noOfAdults
      data.noOfAdults = parseTravellerField(data.noOfAdults);

      // Handle noOfChildren
      data.noOfChildren = parseTravellerField(data.noOfChildren);

      data.lastReminderAt = null;

      const lead      = new Lead(data);
      const savedLead = await lead.save();

      console.log(`✅ [createLead] New lead created: ${savedLead._id} — "${savedLead.leadName}" | source: ${savedLead.source || "Manual"}`);

      res.status(201).json({ message: "Lead created successfully", lead: savedLead });
    } catch (error) {
      console.error("❌ [createLead] Error:", error.message);
      res.status(400).json({ message: error.message });
    }
  },

  /* ── Get All Leads (paginated) ── */
  // getLeads: async (req, res) => {
  //   try {
  //     const page  = Math.max(1, parseInt(req.query.page)  || 1);
  //     const limit = Math.max(1, parseInt(req.query.limit) || 10);
  //     const skip  = (page - 1) * limit;

  //     const roleName = req.user.role.name?.toLowerCase();

  //     console.log(`📋 [getLeads] Request by role="${roleName}" | page=${page} | limit=${limit} | filters:`, {
  //       search:   req.query.search   || null,
  //       status:   req.query.status   || null,
  //       source:   req.query.source   || null,
  //       assignee: req.query.assignee || null,
  //     });

  //     /* ── Operations role: combined leads + deals ── */
  //     if (roleName === "operations") {
  //       const assignedTo = req.user._id;

  //       const leads = await Lead.find({ assignTo: assignedTo })
  //         .populate("assignTo", "firstName lastName email role")
  //         .sort({ createdAt: -1 }).lean();

  //       const deals = await Deal.find({ assignedTo: assignedTo })
  //         .populate("assignedTo", "firstName lastName email role")
  //         .sort({ createdAt: -1 }).lean();

  //       const transformedDeals = deals.map((deal) => ({
  //         _id: deal._id,
  //         leadName: deal.dealName,
  //         phoneNumber: deal.phoneNumber,
  //         destination: deal.destination,
  //         country: deal.country,
  //         source: deal.source,
  //         status: "Deal",
  //         assignTo: deal.assignedTo,
  //         createdAt: deal.createdAt,
  //         followUpDate: deal.followUpDate,
  //         email: deal.email,
  //         noOfAdults:   deal.noOfAdults,
  //         noOfChildren: deal.noOfChildren,
  //         travelDate: deal.travelDate,
  //         _type: "deal",
  //         ...deal,
  //       }));

  //       const combined  = [...leads, ...transformedDeals].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  //       const total     = combined.length;
  //       const paginated = combined.slice(skip, skip + limit);

  //       console.log(`📋 [getLeads] Operations view — leads: ${leads.length}, deals: ${deals.length}, total: ${total}`);

  //       return res.status(200).json({
  //         leads: paginated,
  //         totalLeads: total,
  //         totalPages: Math.ceil(total / limit),
  //         currentPage: page,
  //       });
  //     }

  //     /* ── Admin / Sales role ── */
  //     const filter = roleName === "admin" ? {} : { assignTo: req.user._id };

  //     if (req.query.search) {
  //       const s = req.query.search;
  //       filter.$or = [
  //         { leadName:    { $regex: s, $options: "i" } },
  //         { email:       { $regex: s, $options: "i" } },
  //         { phoneNumber: { $regex: s, $options: "i" } },
  //         { destination: { $regex: s, $options: "i" } },
  //         { phoneNumber: { $regex: s.replace(/\s+/g, ""), $options: "i" } },
  //       ];
  //     }

  //     if (req.query.status) filter.status = req.query.status;
  //     if (req.query.source) filter.source = req.query.source;

  //     if (req.query.assignee) {
  //       const matchedUser = await userModel.findOne({
  //         $or: [
  //           { firstName: { $regex: req.query.assignee, $options: "i" } },
  //           { lastName:  { $regex: req.query.assignee, $options: "i" } },
  //         ]
  //       }).select("_id").lean();
  //       if (matchedUser) {
  //         filter.assignTo = matchedUser._id;
  //       } else {
  //         console.log(`📋 [getLeads] No user found for assignee filter: "${req.query.assignee}"`);
  //         return res.status(200).json({ leads: [], totalLeads: 0, totalPages: 0, currentPage: page });
  //       }
  //     }

  //     const [leads, totalLeads] = await Promise.all([
  //       Lead.find(filter)
  //         .populate("assignTo", "firstName lastName email role")
  //         .sort({ createdAt: -1 })
  //         .skip(skip)
  //         .limit(limit)
  //         .lean(),
  //       Lead.countDocuments(filter),
  //     ]);

  //     const facebookLeads = leads.filter(l => l.source === "Facebook");
  //     const manualLeads   = leads.filter(l => l.source !== "Facebook");
  //     console.log(`📋 [getLeads] Fetched ${leads.length} leads (page ${page}/${Math.ceil(totalLeads / limit)}) | Manual: ${manualLeads.length}, Facebook: ${facebookLeads.length}, Total DB: ${totalLeads}`);

  //     res.status(200).json({
  //       leads,
  //       totalLeads,
  //       totalPages: Math.ceil(totalLeads / limit),
  //       currentPage: page,
  //     });
  //   } catch (error) {
  //     console.error("❌ [getLeads] Error:", error.message);
  //     res.status(500).json({ message: error.message });
  //   }
  // },//original all work correctly..


getLeads: async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    const roleName = req.user.role.name?.toLowerCase();

    console.log(`📋 [getLeads] Request by role="${roleName}" | page=${page} | limit=${limit} | filters:`, {
      search:   req.query.search   || null,
      status:   req.query.status   || null,
      source:   req.query.source   || null,
      assignee: req.query.assignee || null,
    });

    /* ── Operations role: combined leads + deals ── */
    if (roleName === "operations") {
      const assignedTo = req.user._id;

      const leads = await Lead.find({ assignTo: assignedTo })
        .populate("assignTo", "firstName lastName email role")
        .sort({ createdAt: -1 }).lean();

      const deals = await Deal.find({ assignedTo: assignedTo })
        .populate("assignedTo", "firstName lastName email role")
        .sort({ createdAt: -1 }).lean();

      const transformedDeals = deals.map((deal) => ({
        _id: deal._id,
        leadName: deal.dealName,
        phoneNumber: deal.phoneNumber,
        destination: deal.destination,
        country: deal.country,
        source: deal.source,
        status: "Deal",
        assignTo: deal.assignedTo,
        createdAt: deal.createdAt,
        followUpDate: deal.followUpDate,
        email: deal.email,
        noOfAdults:   deal.noOfAdults,
        noOfChildren: deal.noOfChildren,
        travelDate: deal.travelDate,
        _type: "deal",
        ...deal,
      }));

      const combined  = [...leads, ...transformedDeals].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const total     = combined.length;
      const paginated = combined.slice(skip, skip + limit);

      console.log(`📋 [getLeads] Operations view — leads: ${leads.length}, deals: ${deals.length}, total: ${total}`);

      return res.status(200).json({
        leads: paginated,
        totalLeads: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      });
    }

    /* ── Admin / Sales role ── */
    const filter = roleName === "admin" ? {} : { assignTo: req.user._id };

    if (req.query.search) {
      const s = req.query.search;
      filter.$or = [
        { leadName:    { $regex: s, $options: "i" } },
        { email:       { $regex: s, $options: "i" } },
        { phoneNumber: { $regex: s, $options: "i" } },
        { destination: { $regex: s, $options: "i" } },
        { phoneNumber: { $regex: s.replace(/\s+/g, ""), $options: "i" } },
      ];
    }

    if (req.query.status) filter.status = req.query.status;
    if (req.query.source) filter.source = req.query.source;

    // FIXED: Handle assignee filter - now expects User ID directly
    if (req.query.assignee) {
      // Check if assignee is a valid MongoDB ObjectId
      const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(req.query.assignee);
      
      if (isValidObjectId) {
        // Direct ID match (from frontend)
        filter.assignTo = req.query.assignee;
        console.log(`📋 [getLeads] Filtering by assignee ID: ${req.query.assignee}`);
      } else {
        // Fallback for name search (backward compatibility)
        const matchedUser = await userModel.findOne({
          $or: [
            { firstName: { $regex: req.query.assignee, $options: "i" } },
            { lastName:  { $regex: req.query.assignee, $options: "i" } },
          ]
        }).select("_id").lean();
        
        if (matchedUser) {
          filter.assignTo = matchedUser._id;
          console.log(`📋 [getLeads] Filtering by assignee name: "${req.query.assignee}" -> ID: ${matchedUser._id}`);
        } else {
          console.log(`📋 [getLeads] No user found for assignee filter: "${req.query.assignee}"`);
          return res.status(200).json({ 
            leads: [], 
            totalLeads: 0, 
            totalPages: 0, 
            currentPage: page 
          });
        }
      }
    }

    const [leads, totalLeads] = await Promise.all([
      Lead.find(filter)
        .populate("assignTo", "firstName lastName email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Lead.countDocuments(filter),
    ]);

    const facebookLeads = leads.filter(l => l.source === "Facebook");
    const manualLeads   = leads.filter(l => l.source !== "Facebook");
    console.log(`📋 [getLeads] Fetched ${leads.length} leads (page ${page}/${Math.ceil(totalLeads / limit)}) | Manual: ${manualLeads.length}, Facebook: ${facebookLeads.length}, Total DB: ${totalLeads}`);

    res.status(200).json({
      leads,
      totalLeads,
      totalPages: Math.ceil(totalLeads / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error("❌ [getLeads] Error:", error.message);
    res.status(500).json({ message: error.message });
  }
},


  /* ── Get Lead by ID ── */
  getLeadById: async (req, res) => {
    try {
      const lead = await Lead.findById(req.params.id).populate("assignTo", "firstName lastName email role");
      if (!lead) return res.status(404).json({ message: "Lead not found" });

      console.log(`🔍 [getLeadById] Lead fetched: ${lead._id} — "${lead.leadName}" | source: ${lead.source}`);

      res.status(200).json(lead);
    } catch (error) {
      console.error("❌ [getLeadById] Error:", error.message);
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

      // Handle travelDate
      if (patch.travelDate && patch.travelDate !== "null" && String(patch.travelDate).trim() !== "") {
        patch.travelDate = new Date(patch.travelDate);
      } else if (patch.travelDate === "" || patch.travelDate === "null") {
        patch.travelDate = null;
      }

      // Handle noOfAdults
      if (patch.noOfAdults !== undefined) {
        patch.noOfAdults = parseTravellerField(patch.noOfAdults);
      }

      // Handle noOfChildren
      if (patch.noOfChildren !== undefined) {
        patch.noOfChildren = parseTravellerField(patch.noOfChildren);
      }

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

      console.log(`✏️  [updateLead] Lead updated: ${updated._id} — "${updated.leadName}" | status: ${before.status} → ${updated.status}`);

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
      console.error("❌ [updateLead] Error:", error.message);
      res.status(400).json({ message: error.message });
    }
  },

  /* ── Delete Lead ── */
  deleteLead: async (req, res) => {
    try {
      const lead = await Lead.findByIdAndDelete(req.params.id);
      if (!lead) return res.status(404).json({ message: "Lead not found" });

      console.log(`🗑️  [deleteLead] Lead deleted: ${req.params.id} — "${lead.leadName}"`);

      res.status(200).json({ message: "Lead deleted successfully" });
    } catch (error) {
      console.error("❌ [deleteLead] Error:", error.message);
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

      console.log(`📅 [updateFollowUpDate] Lead: ${req.params.id} | followUp: ${followUpDate}`);

      return res.status(200).json({ message: "Follow-up date updated", lead });
    } catch (error) {
      console.error("❌ [updateFollowUpDate] Error:", error.message);
      return res.status(400).json({ message: error.message });
    }
  },

  /* ── Convert Lead to Deal ── */
  convertLeadToDeal: async (req, res) => {
    try {
      const lead = await Lead.findById(req.params.id).populate("assignTo");
      if (!lead) return res.status(404).json({ message: "Lead not found" });
      if (lead.status === "Converted")
        return res.status(400).json({ message: "Lead already converted" });

      const {
        value, notes, currency,
        purchasingLandCost, purchasingTicketCost,
        sellingLandCost,    sellingTicketCost,
        noOfAdults,   noOfChildren,
        travelDate,
      } = req.body;

      const numericValue    = Number(value || 0);
      const formattedNumber = new Intl.NumberFormat("en-IN").format(numericValue);
      const formattedValue  = `${formattedNumber} ${currency || "INR"}`;

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
        email:       lead.email       || "",
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
        purchasingLandCost:   pLand,
        purchasingTicketCost: pTicket,
        sellingLandCost:      sLand,
        sellingTicketCost:    sTicket,
        totalPurchasingCost:  pLand   + pTicket,
        totalSellingCost:     sLand   + sTicket,
        profit:               (sLand  + sTicket) - (pLand + pTicket),
        // ── UPDATED: use noOfAdults/noOfChildren from body, fallback to lead fields ──
        noOfAdults:   noOfAdults   != null ? parseTravellerField(noOfAdults)   : (lead.noOfAdults   || null),
        noOfChildren: noOfChildren != null ? parseTravellerField(noOfChildren) : (lead.noOfChildren || null),
        travelDate:   travelDate   ? new Date(travelDate) : (lead.travelDate || null),
      });

      await deal.save();
      await Lead.findByIdAndDelete(req.params.id);

      console.log(`🤝 [convertLeadToDeal] Lead "${lead.leadName}" (${lead._id}) → Deal "${deal._id}" | source: ${lead.source}`);

      const userId = lead.assignTo?._id?.toString();
      if (userId) notifyUser(userId, "deal:created", { dealId: deal._id, dealName: deal.dealName });

      res.status(200).json({ message: "Lead converted to deal", deal });
    } catch (error) {
      console.error("❌ [convertLeadToDeal] Error:", error.message, error.stack);
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
      console.error("❌ [getRecentLeads] Error:", error.message);
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
      console.error("❌ [getPendingLeads] Error:", error.message);
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

      console.log(`🔄 [updateLeadStatus] Lead: ${req.params.id} | "${lead.leadName}" | ${oldStatus} → ${status}`);

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
      console.error("❌ [updateLeadStatus] Error:", error.message);
      res.status(500).json({ message: error.message });
    }
  },
};