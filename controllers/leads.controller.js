



// import dayjs from "dayjs";
// import Lead from "../models/leads.model.js";
// import userModel from "../models/user.model.js";
// import sendEmail from "../services/email.js";
// import { notifyUser } from "../realtime/socket.js";
// import Deal from "../models/deals.model.js";

// const pickNextSalesUser = async () => {
//   // pull users + role populated (if role is ref)
//   const users = await userModel
//     .find({})
//     .populate("role", "name") // if role is ObjectId ref, this will work
//     .select("_id firstName lastName role createdAt")
//     .sort({ createdAt: 1, _id: 1 })
//     .lean();

//   // detect role name in multiple formats
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

// export default {
//   // ➡️ Create Lead (FULL UPDATED)



// // createLead: async (req, res) => {
// //   try {
// //     const { leadName, companyName, phoneNumber, email } = req.body;

// //     if (!leadName || !companyName || !phoneNumber) {
// //       return res.status(400).json({
// //         message: "Lead name, company name, and phone number are required",
// //       });
// //     }

// //     const data = { ...req.body };

// //     // ✅ Handle file uploads — path saved WITHOUT leading slash
// //     // Correct:  "uploads/leads/filename.png"
// //     // Wrong:   "/uploads/leads/filename.png"  ← causes 404 on download/preview
// //     if (req.files?.length > 0) {
// //       data.attachments = req.files.map((file) => ({
// //         name: file.originalname,
// //         path: `uploads/leads/${file.filename}`,  // ✅ no leading slash
// //         type: file.mimetype,
// //         size: file.size,
// //         uploadedAt: new Date(),
// //       }));
// //     }

// //     // ✅ AUTO ASSIGN (Round-robin Sales users)
// //     const autoAssignee = await pickNextSalesUser();
// //     data.assignTo = autoAssignee;

// //     // ✅ Default status if not provided
// //     if (!data.status) data.status = "Cold";

// //     // ✅ followUpDate = create date
// //     data.followUpDate = new Date();
// //     data.lastReminderAt = null;

// //     const lead = new Lead(data);
// //     const savedLead = await lead.save();

// //     res.status(201).json({
// //       message: "Lead created successfully",
// //       lead: savedLead,
// //     });
// //   } catch (error) {
// //     res.status(400).json({ message: error.message });
// //   }
// // },//old one..


//   createLead : async (req, res) => {
//   try {
//     const { leadName, designation, phoneNumber } = req.body; // designation replaces companyName

//     // Required fields validation
//     if (!leadName || !designation || !phoneNumber) {
//       return res.status(400).json({
//         message: "Lead name, designation, and phone number are required",
//       });
//     }

//     const data = { ...req.body };

//     // Handle file uploads – store relative path without leading slash
//     if (req.files?.length > 0) {
//       data.attachments = req.files.map((file) => ({
//         name: file.originalname,
//         path: `uploads/leads/${file.filename}`,
//         type: file.mimetype,
//         size: file.size,
//         uploadedAt: new Date(),
//       }));
//     }

//     // Auto assign (round‑robin) – keep existing
//     const autoAssignee = await pickNextSalesUser();
//     data.assignTo = autoAssignee;

//     // Default status if not provided
//     if (!data.status) data.status = "Cold";

//     // Set follow‑up date to creation date
//     data.followUpDate = new Date();
//     data.lastReminderAt = null;

//     const lead = new Lead(data);
//     const savedLead = await lead.save();

//     res.status(201).json({
//       message: "Lead created successfully",
//       lead: savedLead,
//     });
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// },

//   // ➡️ Get All Leads
//   getLeads: async (req, res) => {
//     try {
//       const query =
//         req.user.role.name === "Admin" ? {} : { assignTo: req.user._id };

//       const leads = await Lead.find(query).populate(
//         "assignTo",
//         "firstName lastName email role"
//       );

//       res.status(200).json(leads);
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

//   // ✅ Update Lead (FULL UPDATED - no auto followUpDate changes)
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
//           name: file.originalname,
//           path: `/uploads/leads/${file.filename}`,
//           type: file.mimetype,
//           size: file.size,
//           uploadedAt: new Date(),
//         }));
//       }

//       patch.attachments = [...existingAttachments, ...newFiles];

//       // ✅ Status change: reset reminder only (DON’T change followUpDate automatically)
//       if (patch.status && patch.status !== before.status) {
//         patch.lastReminderAt = null;
//       }

//       // ✅ If followUpDate manually updated: reset reminder
//       if (patch.followUpDate) {
//         patch.lastReminderAt = null;
//       }

//       const updated = await Lead.findByIdAndUpdate(req.params.id, patch, {
//         new: true,
//       }).populate("assignTo", "firstName lastName email");

//       // Notify if converted
//       if (before.status !== "Converted" && updated.status === "Converted") {
//         const userId = updated.assignTo?._id?.toString();
//         const fullName = `${updated.assignTo?.firstName || ""} ${
//           updated.assignTo?.lastName || ""
//         }`.trim();

//         if (userId) {
//           notifyUser(userId, "deal:converted", {
//             leadId: updated._id,
//             leadName: updated.leadName,
//             when: new Date(),
//           });
//         }

//         if (updated.assignTo?.email) {
//           await sendEmail({
//             to: updated.assignTo.email,
//             subject: `🎉 Deal Converted: ${updated.leadName}`,
//             text: `Deal converted for lead ${updated.leadName}. Congrats, ${fullName}!`,
//           });
//         }
//       }

//       res.status(200).json({
//         message: "Lead updated successfully",
//         lead: updated,
//       });
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

//   updateFollowUpDate: async (req, res) => {
//     try {
//       const { followUpDate } = req.body;
//       if (!followUpDate) {
//         return res.status(400).json({ message: "followUpDate required" });
//       }

//       const lead = await Lead.findByIdAndUpdate(
//         req.params.id,
//         { followUpDate, lastReminderAt: null },
//         { new: true }
//       ).populate("assignTo", "firstName lastName email");

//       if (!lead) return res.status(404).json({ message: "Lead not found" });

//       return res.status(200).json({
//         message: "Follow-up date updated",
//         lead,
//       });
//     } catch (error) {
//       return res.status(400).json({ message: error.message });
//     }
//   },

//   // Convert Lead to Deal Controller (kept same as yours)
//   convertLeadToDeal: async (req, res) => {
//     try {
//       const lead = await Lead.findById(req.params.id).populate("assignTo");
//       if (!lead) return res.status(404).json({ message: "Lead not found" });
//       if (lead.status === "Converted") {
//         return res.status(400).json({ message: "Lead already converted" });
//       }

//       const { value, notes, currency } = req.body;

//       const numericValue = Number(value || 0);
//       const formattedNumber = new Intl.NumberFormat("en-IN").format(numericValue);
//       const formattedValue = `${formattedNumber} ${currency || "INR"}`;

//       const followUpDate = lead.followUpDate;
//       const reminderSentAt = lead.lastReminderAt;
//       const followUpStatus = lead.followUpStatus || "Pending";
//       const followUpFrequencyDays = lead.followUpFrequencyDays || null;

//       const deal = new Deal({
//         leadId: lead._id,
//         dealName: lead.leadName,
//         assignedTo: lead.assignTo?._id,
//         value: formattedValue,
//         notes,
//         stage: "Qualification",
//         email: lead.email || "",
//         phoneNumber: lead.phoneNumber,
//         source: lead.source,
//         companyName: lead.companyName,
//         industry: lead.industry,
//         requirement: lead.requirement,
//         country: lead.country,
//         address: lead.address,
//         attachments: lead.attachments || [],
//         followUpDate,
//         reminderSentAt,
//         followUpStatus,
//         followUpFrequencyDays,
//       });

//       await deal.save();
//       await Lead.findByIdAndDelete(req.params.id);

//       const userId = lead.assignTo?._id?.toString();
//       if (userId) {
//         notifyUser(userId, "deal:created", {
//           dealId: deal._id,
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

//   // ✅ Update Lead Status (FULL UPDATED - no followUpDate recompute)
//   updateLeadStatus: async (req, res) => {
//     try {
//       const { status } = req.body;
//       if (!status) return res.status(400).json({ message: "Status required" });

//       const lead = await Lead.findById(req.params.id).populate("assignTo");
//       if (!lead) return res.status(404).json({ message: "Lead not found" });

//       const oldStatus = lead.status;
//       lead.status = status;

//       if (status !== oldStatus) lead.lastReminderAt = null;
//       await lead.save();

//       if (oldStatus !== "Converted" && status === "Converted") {
//         const userId = lead.assignTo?._id?.toString();
//         const fullName = `${lead.assignTo?.firstName || ""} ${
//           lead.assignTo?.lastName || ""
//         }`.trim();

//         if (userId) {
//           notifyUser(userId, "deal:converted", {
//             leadId: lead._id,
//             leadName: lead.leadName,
//             when: new Date(),
//           });
//         }

//         if (lead.assignTo?.email) {
//           await sendEmail({
//             to: lead.assignTo.email,
//             subject: `🎉 Deal Converted: ${lead.leadName}`,
//             text: `Deal converted for lead ${lead.leadName}. Congrats, ${fullName}!`,
//           });
//         }
//       }

//       res.status(200).json({
//         message: "Lead status updated successfully",
//         lead,
//       });
//     } catch (error) {
//       res.status(500).json({ message: error.message });
//     }
//   },
// };//original



// import dayjs from "dayjs";
// import Lead from "../models/leads.model.js";
// import userModel from "../models/user.model.js";
// import sendEmail from "../services/email.js";
// import { notifyUser } from "../realtime/socket.js";
// import Deal from "../models/deals.model.js";

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

// export default {

//   // ➡️ Create Lead
//   // createLead: async (req, res) => {
//   //   try {
//   //     const { leadName, destination, phoneNumber } = req.body; // destination (was designation)

//   //     if (!leadName || !destination || !phoneNumber) {
//   //       return res.status(400).json({
//   //         message: "Lead name, destination, and phone number are required",
//   //       });
//   //     }

//   //     const data = { ...req.body };

//   //     // Handle file uploads – store relative path without leading slash
//   //     if (req.files?.length > 0) {
//   //       data.attachments = req.files.map((file) => ({
//   //         name:       file.originalname,
//   //         path:       `uploads/leads/${file.filename}`,
//   //         type:       file.mimetype,
//   //         size:       file.size,
//   //         uploadedAt: new Date(),
//   //       }));
//   //     }

//   //     // Auto assign (round-robin)
//   //     const autoAssignee = await pickNextSalesUser();
//   //     data.assignTo = autoAssignee;

//   //     if (!data.status) data.status = "Cold";

//   //     data.followUpDate  = new Date();
//   //     data.lastReminderAt = null;

//   //     const lead      = new Lead(data);
//   //     const savedLead = await lead.save();

//   //     res.status(201).json({ message: "Lead created successfully", lead: savedLead });
//   //   } catch (error) {
//   //     res.status(400).json({ message: error.message });
//   //   }
//   // },//old one..

//    // ➡️ Create Lead
//   createLead: async (req, res) => {
//     try {
//       const { leadName, destination, phoneNumber } = req.body;
 
//       if (!leadName || !destination || !phoneNumber) {
//         return res.status(400).json({
//           message: "Lead name, destination, and phone number are required",
//         });
//       }
 
//       const data = { ...req.body };
 
//       // Handle file uploads
//       if (req.files?.length > 0) {
//         data.attachments = req.files.map((file) => ({
//           name:       file.originalname,
//           path:       `uploads/leads/${file.filename}`,
//           type:       file.mimetype,
//           size:       file.size,
//           uploadedAt: new Date(),
//         }));
//       }
 
//       // Auto assign (round-robin)
//       const autoAssignee = await pickNextSalesUser();
//       data.assignTo = autoAssignee;
 
//       if (!data.status) data.status = "Cold";
 
//       // ✅ FIX: Use the date the user picked from the form.
//       // OLD code had:  data.followUpDate = new Date();
//       // That line always overwrote the user's chosen date with TODAY.
//       //
//       // FormData sends everything as strings. Handle these cases:
//       //   "2026-03-19"  → valid date picked by user  ✅ use it
//       //   ""            → user left it blank          ✅ store null
//       //   "null"        → frontend sent explicit null ✅ store null
//       if (
//         data.followUpDate &&
//         data.followUpDate !== "null" &&
//         data.followUpDate.trim() !== ""
//       ) {
//         data.followUpDate = new Date(data.followUpDate); // e.g. 2026-03-19 → Date obj
//       } else {
//         data.followUpDate = null; // no default to today
//       }
 
//       data.lastReminderAt = null;
 
//       const lead      = new Lead(data);
//       const savedLead = await lead.save();
 
//       res.status(201).json({ message: "Lead created successfully", lead: savedLead });
//     } catch (error) {
//       res.status(400).json({ message: error.message });
//     }
//   },

//   // ➡️ Get All Leads
//   // getLeads: async (req, res) => {
//   //   try {
//   //     const query =
//   //       req.user.role.name === "Admin" ? {} : { assignTo: req.user._id };

//   //     const leads = await Lead.find(query).populate(
//   //       "assignTo",
//   //       "firstName lastName email role"
//   //     );

//   //     res.status(200).json(leads);
//   //   } catch (error) {
//   //     res.status(500).json({ message: error.message });
//   //   }
//   // },//old one

//   // ✅ Replace your existing getLeads function with this

// getLeads: async (req, res) => {
//   try {
//     const page  = Math.max(1, parseInt(req.query.page)  || 1);
//     const limit = Math.max(1, parseInt(req.query.limit) || 10);
//     const skip  = (page - 1) * limit;

//     // Role-based filter — Admin sees all, others see only their own leads
//     const filter =
//       req.user.role.name === "Admin" ? {} : { assignTo: req.user._id };

//     const [leads, totalLeads] = await Promise.all([
//       Lead.find(filter)
//         .populate("assignTo", "firstName lastName email role")
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(limit),
//       Lead.countDocuments(filter),
//     ]);

//     res.status(200).json({
//       leads,
//       totalLeads,
//       totalPages:  Math.ceil(totalLeads / limit),
//       currentPage: page,
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// },

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
//   // updateLead: async (req, res) => {
//   //   try {
//   //     const before = await Lead.findById(req.params.id).select(
//   //       "status assignTo leadName followUpDate attachments"
//   //     );
//   //     if (!before) return res.status(404).json({ message: "Lead not found" });

//   //     const patch = { ...req.body };

//   //     // Handle existing + new attachments
//   //     let existingAttachments = [];
//   //     if (req.body.existingAttachments) {
//   //       try {
//   //         existingAttachments = JSON.parse(req.body.existingAttachments);
//   //       } catch {
//   //         existingAttachments = [];
//   //       }
//   //     }

//   //     let newFiles = [];
//   //     if (req.files && req.files.length > 0) {
//   //       newFiles = req.files.map((file) => ({
//   //         name:       file.originalname,
//   //         path:       `/uploads/leads/${file.filename}`,
//   //         type:       file.mimetype,
//   //         size:       file.size,
//   //         uploadedAt: new Date(),
//   //       }));
//   //     }

//   //     patch.attachments = [...existingAttachments, ...newFiles];

//   //     if (patch.status && patch.status !== before.status) {
//   //       patch.lastReminderAt = null;
//   //     }

//   //     if (patch.followUpDate) {
//   //       patch.lastReminderAt = null;
//   //     }

//   //     const updated = await Lead.findByIdAndUpdate(req.params.id, patch, {
//   //       new: true,
//   //     }).populate("assignTo", "firstName lastName email");

//   //     // Notify if converted
//   //     if (before.status !== "Converted" && updated.status === "Converted") {
//   //       const userId   = updated.assignTo?._id?.toString();
//   //       const fullName = `${updated.assignTo?.firstName || ""} ${updated.assignTo?.lastName || ""}`.trim();

//   //       if (userId) {
//   //         notifyUser(userId, "deal:converted", {
//   //           leadId:   updated._id,
//   //           leadName: updated.leadName,
//   //           when:     new Date(),
//   //         });
//   //       }

//   //       if (updated.assignTo?.email) {
//   //         await sendEmail({
//   //           to:      updated.assignTo.email,
//   //           subject: `🎉 Deal Converted: ${updated.leadName}`,
//   //           text:    `Deal converted for lead ${updated.leadName}. Congrats, ${fullName}!`,
//   //         });
//   //       }
//   //     }

//   //     res.status(200).json({ message: "Lead updated successfully", lead: updated });
//   //   } catch (error) {
//   //     res.status(400).json({ message: error.message });
//   //   }
//   // },//old one..

//     // ➡️ Update Lead
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
 
//       // ✅ FIX: Same fix as createLead.
//       // FormData sends followUpDate as a string. Convert correctly:
//       //   "2026-03-19"  → Date object (user's chosen date) ✅
//       //   "" or "null"  → null (no date, don't fallback to today) ✅
//       if (
//         patch.followUpDate &&
//         patch.followUpDate !== "null" &&
//         patch.followUpDate.trim() !== ""
//       ) {
//         patch.followUpDate  = new Date(patch.followUpDate);
//         patch.lastReminderAt = null; // reset so cron re-triggers on new date
//       } else if (
//         patch.followUpDate === "" ||
//         patch.followUpDate === "null"
//       ) {
//         patch.followUpDate = null;
//       }
 
//       if (patch.status && patch.status !== before.status) {
//         patch.lastReminderAt = null;
//       }
 
//       const updated = await Lead.findByIdAndUpdate(req.params.id, patch, {
//         new: true,
//       }).populate("assignTo", "firstName lastName email");
 
//       // Notify if converted
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
//   },//old one..

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

//   // ➡️ Update Follow-Up Date
//   // updateFollowUpDate: async (req, res) => {
//   //   try {
//   //     const { followUpDate } = req.body;
//   //     if (!followUpDate)
//   //       return res.status(400).json({ message: "followUpDate required" });

//   //     const lead = await Lead.findByIdAndUpdate(
//   //       req.params.id,
//   //       { followUpDate, lastReminderAt: null },
//   //       { new: true }
//   //     ).populate("assignTo", "firstName lastName email");

//   //     if (!lead) return res.status(404).json({ message: "Lead not found" });

//   //     return res.status(200).json({ message: "Follow-up date updated", lead });
//   //   } catch (error) {
//   //     return res.status(400).json({ message: error.message });
//   //   }
//   // },//old one..

//   // ➡️ Update Follow-Up Date
//   updateFollowUpDate: async (req, res) => {
//     try {
//       const { followUpDate } = req.body;
//       if (!followUpDate)
//         return res.status(400).json({ message: "followUpDate required" });
 
//       const lead = await Lead.findByIdAndUpdate(
//         req.params.id,
//         { followUpDate, lastReminderAt: null },
//         { new: true }
//       ).populate("assignTo", "firstName lastName email");
 
//       if (!lead) return res.status(404).json({ message: "Lead not found" });
 
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
//         destination: lead.destination, // updated field name
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
// };//all work perfectly..



import dayjs from "dayjs";
import Lead from "../models/leads.model.js";
import userModel from "../models/user.model.js";
import sendEmail from "../services/email.js";
import { notifyUser } from "../realtime/socket.js";
import Deal from "../models/deals.model.js";
import Notification from "../models/notification.model.js"; // ✅ NEW: needed to delete stale notifications

const pickNextSalesUser = async () => {
  const users = await userModel
    .find({})
    .populate("role", "name")
    .select("_id firstName lastName role createdAt")
    .sort({ createdAt: 1, _id: 1 })
    .lean();

  const salesUsers = users.filter((u) => {
    const roleName =
      typeof u.role === "string"
        ? u.role
        : u.role?.name || u.role?.roleName || "";
    return String(roleName).toLowerCase() === "sales";
  });

  if (!salesUsers.length) return null;

  const lastLead = await Lead.findOne({ assignTo: { $ne: null } })
    .sort({ createdAt: -1, _id: -1 })
    .select("assignTo")
    .lean();

  if (!lastLead?.assignTo) return salesUsers[0]._id;

  const lastIdx = salesUsers.findIndex(
    (u) => u._id.toString() === lastLead.assignTo.toString()
  );

  const nextIdx = lastIdx === -1 ? 0 : (lastIdx + 1) % salesUsers.length;
  return salesUsers[nextIdx]._id;
};

// ─────────────────────────────────────────────────────────────────────────────
// ✅ NEW HELPER: When followUpDate changes, delete all old "followup"
//    notifications for that lead from the DB and immediately push
//    "notification_deleted" via socket to each affected user.
//
//    This makes the old notification (e.g. 17-3-26) disappear from the
//    frontend instantly — no page refresh needed.
//    When the new date (19-3-26) arrives, the cron will create fresh ones.
// ─────────────────────────────────────────────────────────────────────────────
const deleteStaleFollowUpNotifications = async (leadId) => {
  try {
    const oldNotifications = await Notification.find({
      "meta.leadId": String(leadId),
      type:          "followup",
    }).lean();

    if (oldNotifications.length === 0) return;

    // Delete from DB
    await Notification.deleteMany({
      "meta.leadId": String(leadId),
      type:          "followup",
    });

    // Group deleted IDs by userId — each user only gets their own IDs
    const userNotifMap = new Map();
    oldNotifications.forEach((n) => {
      const uid = String(n.userId);
      if (!userNotifMap.has(uid)) userNotifMap.set(uid, []);
      userNotifMap.get(uid).push(String(n._id));
    });

    // Emit "notification_deleted" to each user's socket
    // NotificationContext already listens to this and removes them from state
    for (const [userId, ids] of userNotifMap.entries()) {
      notifyUser(userId, "notification_deleted", { ids });
    }

    console.log(
      `🗑️ Deleted ${oldNotifications.length} stale followup notification(s) for lead ${leadId}`
    );
  } catch (err) {
    console.error("❌ Error deleting stale notifications:", err.message);
  }
};

export default {

  // ➡️ Create Lead
  createLead: async (req, res) => {
    try {
      const { leadName, destination, phoneNumber } = req.body;

      if (!leadName || !destination || !phoneNumber) {
        return res.status(400).json({
          message: "Lead name, destination, and phone number are required",
        });
      }

      const data = { ...req.body };

      if (req.files?.length > 0) {
        data.attachments = req.files.map((file) => ({
          name:       file.originalname,
          path:       `uploads/leads/${file.filename}`,
          type:       file.mimetype,
          size:       file.size,
          uploadedAt: new Date(),
        }));
      }

      const autoAssignee = await pickNextSalesUser();
      data.assignTo = autoAssignee;

      if (!data.status) data.status = "Cold";

      // Use user-picked date — never override with today
      if (
        data.followUpDate &&
        data.followUpDate !== "null" &&
        data.followUpDate.trim() !== ""
      ) {
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

  // ➡️ Get All Leads (paginated)
  getLeads: async (req, res) => {
    try {
      const page  = Math.max(1, parseInt(req.query.page)  || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 10);
      const skip  = (page - 1) * limit;

      const filter =
        req.user.role.name === "Admin" ? {} : { assignTo: req.user._id };

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
        totalPages:  Math.ceil(totalLeads / limit),
        currentPage: page,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // ➡️ Get Lead by ID
  getLeadById: async (req, res) => {
    try {
      const lead = await Lead.findById(req.params.id).populate(
        "assignTo",
        "firstName lastName email role"
      );
      if (!lead) return res.status(404).json({ message: "Lead not found" });
      res.status(200).json(lead);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // ➡️ Update Lead
  // ✅ KEY FIX: Compare old vs new followUpDate.
  //    If changed → delete stale notifications + notify users via socket.
  //    Old: 17-3-26 notification disappears immediately from frontend ✅
  //    New: 19-3-26 notification will appear when cron fires on that date ✅
  updateLead: async (req, res) => {
    try {
      const before = await Lead.findById(req.params.id).select(
        "status assignTo leadName followUpDate attachments"
      );
      if (!before) return res.status(404).json({ message: "Lead not found" });

      const patch = { ...req.body };

      // Handle existing + new attachments
      let existingAttachments = [];
      if (req.body.existingAttachments) {
        try {
          existingAttachments = JSON.parse(req.body.existingAttachments);
        } catch {
          existingAttachments = [];
        }
      }

      let newFiles = [];
      if (req.files && req.files.length > 0) {
        newFiles = req.files.map((file) => ({
          name:       file.originalname,
          path:       `/uploads/leads/${file.filename}`,
          type:       file.mimetype,
          size:       file.size,
          uploadedAt: new Date(),
        }));
      }

      patch.attachments = [...existingAttachments, ...newFiles];

      // ── Handle followUpDate string → Date conversion ─────────────────
      // Also track whether the date actually changed so we can clean up
      // stale notifications only when needed
      let followUpDateChanged = false;

      if (
        patch.followUpDate &&
        patch.followUpDate !== "null" &&
        patch.followUpDate.trim() !== ""
      ) {
        const newDate = new Date(patch.followUpDate);
        const oldDate = before.followUpDate ? new Date(before.followUpDate) : null;

        // ✅ Compare at day level — "2026-03-17" vs "2026-03-19"
        if (!oldDate || newDate.toDateString() !== oldDate.toDateString()) {
          followUpDateChanged = true;
        }

        patch.followUpDate   = newDate;
        patch.lastReminderAt = null; // reset so cron fires again for new date

      } else if (patch.followUpDate === "" || patch.followUpDate === "null") {
        // User cleared the date entirely
        if (before.followUpDate) followUpDateChanged = true;
        patch.followUpDate = null;
      }

      if (patch.status && patch.status !== before.status) {
        patch.lastReminderAt = null;
      }

      const updated = await Lead.findByIdAndUpdate(req.params.id, patch, {
        new: true,
      }).populate("assignTo", "firstName lastName email");

      // ✅ If followUpDate changed: delete old notifications & notify via socket
      //    Flow:
      //      User changes 17-3-26 → 19-3-26
      //      → deleteStaleFollowUpNotifications() runs
      //      → DB: DELETE followup notifications for this leadId
      //      → Socket: emit "notification_deleted" { ids } to each user
      //      → Frontend NotificationContext removes them from state instantly
      //      → On 19-3-26, cron fires and creates fresh notification ✅
      if (followUpDateChanged) {
        await deleteStaleFollowUpNotifications(req.params.id);
      }

      // Notify if status changed to Converted
      if (before.status !== "Converted" && updated.status === "Converted") {
        const userId   = updated.assignTo?._id?.toString();
        const fullName = `${updated.assignTo?.firstName || ""} ${updated.assignTo?.lastName || ""}`.trim();

        if (userId) {
          notifyUser(userId, "deal:converted", {
            leadId:   updated._id,
            leadName: updated.leadName,
            when:     new Date(),
          });
        }

        if (updated.assignTo?.email) {
          await sendEmail({
            to:      updated.assignTo.email,
            subject: `🎉 Deal Converted: ${updated.leadName}`,
            text:    `Deal converted for lead ${updated.leadName}. Congrats, ${fullName}!`,
          });
        }
      }

      res.status(200).json({ message: "Lead updated successfully", lead: updated });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  // ➡️ Delete Lead
  deleteLead: async (req, res) => {
    try {
      const lead = await Lead.findByIdAndDelete(req.params.id);
      if (!lead) return res.status(404).json({ message: "Lead not found" });
      res.status(200).json({ message: "Lead deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // ➡️ Update Follow-Up Date (dedicated endpoint)
  // ✅ ALSO fixed — same stale notification cleanup
  updateFollowUpDate: async (req, res) => {
    try {
      const { followUpDate } = req.body;
      if (!followUpDate)
        return res.status(400).json({ message: "followUpDate required" });

      // Read old date before updating
      const before = await Lead.findById(req.params.id).select("followUpDate");
      if (!before) return res.status(404).json({ message: "Lead not found" });

      const newDate    = new Date(followUpDate);
      const oldDate    = before.followUpDate ? new Date(before.followUpDate) : null;
      const dateChanged = !oldDate || newDate.toDateString() !== oldDate.toDateString();

      const lead = await Lead.findByIdAndUpdate(
        req.params.id,
        { followUpDate, lastReminderAt: null },
        { new: true }
      ).populate("assignTo", "firstName lastName email");

      if (!lead) return res.status(404).json({ message: "Lead not found" });

      // ✅ Delete stale notifications if date actually changed
      if (dateChanged) {
        await deleteStaleFollowUpNotifications(req.params.id);
      }

      return res.status(200).json({ message: "Follow-up date updated", lead });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },

  // ➡️ Convert Lead to Deal
  convertLeadToDeal: async (req, res) => {
    try {
      const lead = await Lead.findById(req.params.id).populate("assignTo");
      if (!lead) return res.status(404).json({ message: "Lead not found" });
      if (lead.status === "Converted")
        return res.status(400).json({ message: "Lead already converted" });

      const { value, notes, currency } = req.body;

      const numericValue    = Number(value || 0);
      const formattedNumber = new Intl.NumberFormat("en-IN").format(numericValue);
      const formattedValue  = `${formattedNumber} ${currency || "INR"}`;

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
      });

      await deal.save();
      await Lead.findByIdAndDelete(req.params.id);

      const userId = lead.assignTo?._id?.toString();
      if (userId) {
        notifyUser(userId, "deal:created", {
          dealId:   deal._id,
          dealName: deal.dealName,
        });
      }

      res.status(200).json({ message: "Lead converted to deal", deal });
    } catch (error) {
      console.error("Error converting lead to deal:", error);
      res.status(500).json({ message: error.message });
    }
  },

  // ➡️ Get Recent Leads (last 5)
  getRecentLeads: async (req, res) => {
    try {
      const query =
        req.user.role.name === "Admin" ? {} : { assignTo: req.user._id };

      const leads = await Lead.find(query)
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("assignTo", "firstName lastName email");

      res.status(200).json(leads);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // ➡️ Get Pending Leads (not converted)
  getPendingLeads: async (req, res) => {
    try {
      const query =
        req.user.role.name === "Admin"
          ? { status: { $ne: "Converted" } }
          : { status: { $ne: "Converted" }, assignTo: req.user._id };

      const leads = await Lead.find(query)
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("assignTo", "firstName lastName email");

      res.status(200).json(leads);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // ➡️ Update Lead Status
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

        if (userId) {
          notifyUser(userId, "deal:converted", {
            leadId:   lead._id,
            leadName: lead.leadName,
            when:     new Date(),
          });
        }

        if (lead.assignTo?.email) {
          await sendEmail({
            to:      lead.assignTo.email,
            subject: `🎉 Deal Converted: ${lead.leadName}`,
            text:    `Deal converted for lead ${lead.leadName}. Congrats, ${fullName}!`,
          });
        }
      }

      res.status(200).json({ message: "Lead status updated successfully", lead });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
};