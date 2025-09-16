// import dayjs from "dayjs";
// import Lead from "../models/leads.model.js";
// import userModel from "../models/user.model.js";
// import { STATUS_DAYS } from "../utils/statusDays.js";
// import sendEmail from "../services/email.js";
// import { notifyUser } from "../realtime/socket.js";
// import Deal from "../models/deals.model.js";

// const computeFollowUp = (status) => {
//   const addDays = STATUS_DAYS[status];
//   if (!addDays) return null;
//   return dayjs().add(addDays, "day").toDate();
// };

// export default {
//   // ➡️ Create Lead

//   createLead: async (req, res) => {
//     try {
//       const { leadName, companyName } = req.body;
//       if (!leadName || !companyName) {
//         return res
//           .status(400)
//           .json({ message: "Lead name and company name are required" });
//       }

//       const data = { ...req.body };

//       // Handle file uploads
//       if (req.files?.length > 0) {
//         data.attachments = req.files.map((file) => ({
//           name: file.originalname,
//           path: `/uploads/leads/${file.filename}`,
//           type: file.mimetype,
//           size: file.size,
//           uploadedAt: new Date(),
//         }));
//       }

//       // Sales users can only assign to themselves
//       if (req.user.role.name !== "Admin") {
//         data.assignTo = req.user._id;
//       }

//       const lead = new Lead(data);
//       const savedLead = await lead.save();

//       res
//         .status(201)
//         .json({ message: "Lead created successfully", lead: savedLead });
//     } catch (error) {
//       res.status(400).json({ message: error.message });
//     }
//   },

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

//   // Update Lead
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

//       // Recompute followUpDate if status changes
//       if (patch.status && patch.status !== before.status) {
//         const computed = computeFollowUp(patch.status);
//         patch.followUpDate = computed || null;
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

//   // ➡️ Update Follow-Up Date
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
//       );
//       if (!lead) return res.status(404).json({ message: "Lead not found" });

//       res.status(200).json(lead);
//     } catch (error) {
//       res.status(400).json({ message: error.message });
//     }
//   },

//   // ➡️ Convert Lead to Deal
// // convertLeadToDeal: async (req, res) => {
// //   try {
// //     const lead = await Lead.findById(req.params.id).populate("assignTo");
// //     if (!lead) return res.status(404).json({ message: "Lead not found" });
// //     if (lead.status === "Converted") {
// //       return res.status(400).json({ message: "Lead already converted" });
// //     }

// //     const { value, notes, currency } = req.body;

// //     // ✅ Format value with commas
// //     const formattedNumber = new Intl.NumberFormat("en-US").format(
// //       Number(value || 0)
// //     );

// //     // ✅ Final formatted value (e.g. "1,524 INR")
// //     const formattedValue = `${formattedNumber} ${currency}`;

// //     // Save follow-up fields
// //     const followUpDate = lead.followUpDate;
// //     const reminderSentAt = lead.lastReminderAt;
// //     const followUpStatus = lead.followUpStatus || "Pending";
// //     const followUpFrequencyDays = lead.followUpFrequencyDays || null;

// //     const deal = new Deal({
// //       leadId: lead._id,
// //       dealName: lead.leadName,
// //       assignedTo: lead.assignTo?._id,
// //       value: formattedValue, // ✅ "1,524 INR"
// //       notes,
// //       stage: "Qualification",
// //       email: lead.email || "",
// //       phoneNumber: lead.phoneNumber,
// //       source: lead.source,
// //       companyName: lead.companyName,
// //       industry: lead.industry,
// //       requirement: lead.requirement,
// //       country: lead.country,
// //       address: lead.address,
// //       // attachments: lead.attachments,
// //       attachments: lead.attachments || [],
// //       followUpDate,
// //       reminderSentAt,
// //       followUpStatus,
// //       followUpFrequencyDays,
// //     });

// //     await deal.save();

// //     // ❌ Remove the lead
// //     await Lead.findByIdAndDelete(req.params.id);

// //     // Notify assignee
// //     const userId = lead.assignTo?._id?.toString();
// //     if (userId) {
// //       notifyUser(userId, "deal:created", {
// //         dealId: deal._id,
// //         dealName: deal.dealName,
// //       });
// //     }

// //     res.status(200).json({ message: "Lead converted to deal", deal });
// //   } catch (error) {
// //     console.error("Error converting lead to deal:", error);
// //     res.status(500).json({ message: error.message });
// //   }
// // },

//  convertLeadToDeal: async (req, res) => {
//     try {
//       const lead = await Lead.findById(req.params.id).populate("assignTo");
//       if (!lead) return res.status(404).json({ message: "Lead not found" });
//       if (lead.status === "Converted") {
//         return res.status(400).json({ message: "Lead already converted" });
//       }

//       const { value, notes, currency } = req.body;

//       // ✅ Format value
//       const numeric = Number(value || 0);
//       const formattedNumber = new Intl.NumberFormat("en-US").format(numeric);
//       const formattedValue = `${formattedNumber} ${currency}`;

//       // ✅ Normalize attachments from lead
//       const attachments = (lead.attachments || []).map((att) => ({
//         name: att.name || "",
//         path: att.path || att, // in case it's just a string
//         type: att.type || "",
//       }));

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
//         attachments,
//         followUpDate: lead.followUpDate,
//         reminderSentAt: lead.lastReminderAt,
//         followUpStatus: lead.followUpStatus || "Pending",
//         followUpFrequencyDays: lead.followUpFrequencyDays || null,
//       });

//       await deal.save();

//       // ❌ remove lead after conversion
//       await Lead.findByIdAndDelete(req.params.id);

//       // Notify assignee
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
// };

import dayjs from "dayjs";
import Lead from "../models/leads.model.js";
import userModel from "../models/user.model.js";
import { STATUS_DAYS } from "../utils/statusDays.js";
import sendEmail from "../services/email.js";
import { notifyUser } from "../realtime/socket.js";
import Deal from "../models/deals.model.js";

const computeFollowUp = (status) => {
  const addDays = STATUS_DAYS[status];
  if (!addDays) return null;
  return dayjs().add(addDays, "day").toDate();
};

export default {
  // ➡️ Create Lead

  createLead: async (req, res) => {
    try {
      const { leadName, companyName } = req.body;
      if (!leadName || !companyName) {
        return res
          .status(400)
          .json({ message: "Lead name and company name are required" });
      }

      const data = { ...req.body };

      // Handle file uploads
      if (req.files?.length > 0) {
        data.attachments = req.files.map((file) => ({
          name: file.originalname,
          path: `/uploads/leads/${file.filename}`,
          type: file.mimetype,
          size: file.size,
          uploadedAt: new Date(),
        }));
      }

      // Sales users can only assign to themselves
      if (req.user.role.name !== "Admin") {
        data.assignTo = req.user._id;
      }

      const lead = new Lead(data);
      const savedLead = await lead.save();

      res
        .status(201)
        .json({ message: "Lead created successfully", lead: savedLead });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  // ➡️ Get All Leads
  getLeads: async (req, res) => {
    try {
      const query =
        req.user.role.name === "Admin" ? {} : { assignTo: req.user._id };

      const leads = await Lead.find(query).populate(
        "assignTo",
        "firstName lastName email role"
      );

      res.status(200).json(leads);
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

  // Update Lead
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
          name: file.originalname,
          path: `/uploads/leads/${file.filename}`,
          type: file.mimetype,
          size: file.size,
          uploadedAt: new Date(),
        }));
      }

      patch.attachments = [...existingAttachments, ...newFiles];

      // Recompute followUpDate if status changes
      if (patch.status && patch.status !== before.status) {
        const computed = computeFollowUp(patch.status);
        patch.followUpDate = computed || null;
        patch.lastReminderAt = null;
      }

      const updated = await Lead.findByIdAndUpdate(req.params.id, patch, {
        new: true,
      }).populate("assignTo", "firstName lastName email");

      // Notify if converted
      if (before.status !== "Converted" && updated.status === "Converted") {
        const userId = updated.assignTo?._id?.toString();
        const fullName = `${updated.assignTo?.firstName || ""} ${
          updated.assignTo?.lastName || ""
        }`.trim();

        if (userId) {
          notifyUser(userId, "deal:converted", {
            leadId: updated._id,
            leadName: updated.leadName,
            when: new Date(),
          });
        }

        if (updated.assignTo?.email) {
          await sendEmail({
            to: updated.assignTo.email,
            subject: `🎉 Deal Converted: ${updated.leadName}`,
            text: `Deal converted for lead ${updated.leadName}. Congrats, ${fullName}!`,
          });
        }
      }

      res.status(200).json({
        message: "Lead updated successfully",
        lead: updated,
      });
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

  // ➡️ Update Follow-Up Date
  updateFollowUpDate: async (req, res) => {
    try {
      const { followUpDate } = req.body;
      if (!followUpDate) {
        return res.status(400).json({ message: "followUpDate required" });
      }

      const lead = await Lead.findByIdAndUpdate(
        req.params.id,
        { followUpDate, lastReminderAt: null },
        { new: true }
      );
      if (!lead) return res.status(404).json({ message: "Lead not found" });

      res.status(200).json(lead);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  // Convert Lead to Deal Controller (already correct, but including for reference)
  convertLeadToDeal: async (req, res) => {
    try {
      const lead = await Lead.findById(req.params.id).populate("assignTo");
      if (!lead) return res.status(404).json({ message: "Lead not found" });
      if (lead.status === "Converted") {
        return res.status(400).json({ message: "Lead already converted" });
      }

      const { value, notes, currency } = req.body;

      // Format value with commas
      const numericValue = Number(value || 0);
      const formattedNumber = new Intl.NumberFormat("en-IN").format(
        numericValue
      );
      const formattedValue = `${formattedNumber} ${currency || "INR"}`;

      // Save follow-up fields
      const followUpDate = lead.followUpDate;
      const reminderSentAt = lead.lastReminderAt;
      const followUpStatus = lead.followUpStatus || "Pending";
      const followUpFrequencyDays = lead.followUpFrequencyDays || null;

      const deal = new Deal({
        leadId: lead._id,
        dealName: lead.leadName,
        assignedTo: lead.assignTo?._id,
        value: formattedValue,
        notes,
        stage: "Qualification",
        email: lead.email || "",
        phoneNumber: lead.phoneNumber,
        source: lead.source,
        companyName: lead.companyName,
        industry: lead.industry,
        requirement: lead.requirement,
        country: lead.country,
        address: lead.address,
        attachments: lead.attachments || [],
        followUpDate,
        reminderSentAt,
        followUpStatus,
        followUpFrequencyDays,
      });

      await deal.save();

      // Remove the lead
      await Lead.findByIdAndDelete(req.params.id);

      // Notify assignee
      const userId = lead.assignTo?._id?.toString();
      if (userId) {
        notifyUser(userId, "deal:created", {
          dealId: deal._id,
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
};
