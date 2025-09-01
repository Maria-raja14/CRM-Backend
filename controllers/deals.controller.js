// import Deal from "../models/deals.model.js";
// import Lead from "../models/leads.model.js";
// import sendEmail from "../services/email.js";
// import { notifyUser } from "../realtime/socket.js";

// export default {
//   // 1️⃣ Convert Lead → Deal
//   createDealFromLead: async (req, res) => {
//     try {
//       const lead = await Lead.findById(req.params.leadId).populate("assignTo");
//       if (!lead) return res.status(404).json({ message: "Lead not found" });
//       if (lead.status === "Converted")
//         return res.status(400).json({ message: "Lead already converted" });

//       // Update lead status
//       lead.status = "Converted";
//       lead.followUpDate = null;
//       lead.lastReminderAt = null;
//       await lead.save();

//       // Create Deal
//       const deal = new Deal({
//         leadId: lead._id,

//         dealName: lead.leadName,
//         assignedTo: lead.assignTo?._id,
//         stage: "Qualification",
//       });
//       await deal.save();

//       // Notify + Email
//       const userId = lead.assignTo?._id?.toString();
//       if (userId)
//         notifyUser(userId, "deal:created", {
//           dealId: deal._id,
//           dealName: deal.dealName,
//         });
//       if (lead.assignTo?.email) {
//         await sendEmail({
//           to: lead.assignTo.email,
//           subject: `New Deal Created: ${deal.dealName}`,
//           text: `Deal created for lead ${lead.leadName}. Stage: Qualification`,
//         });
//       }

//       res.status(200).json({ message: "Lead converted to deal", deal });
//     } catch (err) {
//       res.status(500).json({ message: err.message });
//     }
//   },


// createManualDeal: async (req, res) => {
//   try {
//     const { leadId, assignedTo, value, stage, notes } = req.body;

//     if (!leadId) {
//       return res.status(400).json({ message: "leadId is required" });
//     }

//     // ✅ Find lead by ID
//     const lead = await Lead.findById(leadId);
//     if (!lead) {
//       return res.status(404).json({ message: "Lead not found" });
//     }

//     const allowedStages = [
//       "Qualification",
//       "Negotiation",
//       "Proposal",
//       "Closed Won",
//       "Closed Lost",
//     ];

//     const dealStage = stage && allowedStages.includes(stage) ? stage : "Qualification";

//     // ✅ Now use lead.leadName instead of ID
//     const deal = new Deal({
//       leadId,
//       dealName: lead.leadName,   // 👈 correct name
//       assignedTo,
//       value: value || 0,
//       stage: dealStage,
//       notes: notes || "",
//     });

//     await deal.save();

//     res.status(201).json({ message: "Manual deal created", deal });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// },




//   // 2️⃣ Get all deals
//   getAllDeals: async (_req, res) => {
//     try {
//       const deals = await Deal.find()
//         .populate("assignedTo", "firstName lastName email")
//         .populate("leadId", "email"); // populate lead email;
//       res.status(200).json(deals);
      
//     } catch (err) {
//       res.status(500).json({ message: err.message });
//     }
//   },

//   // 3️⃣ Update deal stage
//   updateStage: async (req, res) => {
//     try {
//       const { stage } = req.body;
//       const allowedStages = [
//         "Qualification",
//         "Negotiation",
//         "Proposal Sent",
//         "Closed Won",
//         "Closed Lost",
//       ];
//       if (!allowedStages.includes(stage))
//         return res.status(400).json({ message: "Invalid stage" });

//       const deal = await Deal.findByIdAndUpdate(
//         req.params.id,
//         { stage },
//         { new: true }
//       ).populate("assignedTo", "email");
//       if (!deal) return res.status(404).json({ message: "Deal not found" });

//       // Notify + Email
//       if (deal.assignedTo?._id)
//         notifyUser(deal.assignedTo._id.toString(), "deal:stageUpdated", {
//           dealId: deal._id,
//           newStage: stage,
//         });
//       if (deal.assignedTo?.email) {
//         await sendEmail({
//           to: deal.assignedTo.email,
//           subject: `Deal Stage Updated: ${deal.dealName}`,
//           text: `Deal ${deal.dealName} moved to stage: ${stage}`,
//         });
//       }

//       res.status(200).json(deal);
//     } catch (err) {
//       res.status(500).json({ message: err.message });
//     }
//   },

//   updateDeal: async (req, res) => {
//     try {
//       const { assignedTo, stage, value, notes, followUpDate } = req.body;

//       // Allowed stages list
//       const allowedStages = [
//         "Qualification",
//         "Negotiation",
//         "Proposal Sent",
//         "Closed Won",
//         "Closed Lost",
//       ];
//       if (stage && !allowedStages.includes(stage)) {
//         return res.status(400).json({ message: "Invalid stage" });
//       }

//       // Update only editable fields
//       const updateFields = {};
//       if (assignedTo) updateFields.assignedTo = assignedTo;
//       if (stage) updateFields.stage = stage;
//       if (value !== undefined) updateFields.value = value;
//       if (notes !== undefined) updateFields.notes = notes;
//       if (followUpDate !== undefined) updateFields.followUpDate = followUpDate; // 👈 added

//       const deal = await Deal.findByIdAndUpdate(req.params.id, updateFields, {
//         new: true,
//       }).populate("assignedTo", "firstName lastName email");

//       if (!deal) return res.status(404).json({ message: "Deal not found" });

//       // 🔔 Notify + Email
//       if (assignedTo) {
//         notifyUser(assignedTo.toString(), "deal:updated", {
//           dealId: deal._id,
//           dealName: deal.dealName,
//         });
//       }
//       if (deal.assignedTo?.email) {
//         await sendEmail({
//           to: deal.assignedTo.email,
//           subject: `Deal Updated: ${deal.dealName}`,
//           text: `Deal ${deal.dealName} details have been updated. Current Stage: ${deal.stage}`,
//         });
//       }

//       res.status(200).json({ message: "Deal updated successfully", deal });
//     } catch (err) {
//       res.status(500).json({ message: err.message });
//     }
//   },

//   // In your dealsController.js
//   deleteDeal: async (req, res) => {
//     try {
//       const { id } = req.params;

//       const deal = await Deal.findByIdAndDelete(id);

//       if (!deal) {
//         return res.status(404).json({ message: "Deal not found" });
//       }

//       res.status(200).json({ message: "Deal deleted successfully" });
//     } catch (error) {
//       console.error("Delete deal error:", error);
//       res.status(500).json({ message: "Server error", error: error.message });
//     }
//   },
//   pendingDeals: async (_req, res) => {
//     try {
//       // Fetch deals which are not yet closed
//       const deals = await Deal.find({
//         stage: { $nin: ["Closed Won", "Closed Lost"] },
//       })
//         .populate("assignedTo", "firstName lastName email")
//         .sort({ createdAt: -1 })
//         .limit(10); // limit to recent 10 pending deals

//       res.status(200).json(deals);
//     } catch (error) {
//       console.error("Pending deals error:", error);
//       res.status(500).json({ message: "Server error" });
//     }
//   },
// };



import Deal from "../models/deals.model.js";
import Lead from "../models/leads.model.js";
import sendEmail from "../services/email.js";
import { notifyUser } from "../realtime/socket.js";

export default {
  // 1️⃣ Convert Lead → Deal
  createDealFromLead: async (req, res) => {
    try {
      const lead = await Lead.findById(req.params.leadId).populate("assignTo");
      if (!lead) return res.status(404).json({ message: "Lead not found" });
      if (lead.status === "Converted")
        return res.status(400).json({ message: "Lead already converted" });

      lead.status = "Converted";
      lead.followUpDate = null;
      lead.lastReminderAt = null;
      await lead.save();

      const deal = new Deal({
        leadId: lead._id,
        dealName: lead.leadName,
        assignedTo: lead.assignTo?._id,
        stage: "Qualification",
      });
      await deal.save();

      const userId = lead.assignTo?._id?.toString();
      if (userId)
        notifyUser(userId, "deal:created", {
          dealId: deal._id,
          dealName: deal.dealName,
        });
      if (lead.assignTo?.email) {
        await sendEmail({
          to: lead.assignTo.email,
          subject: `New Deal Created: ${deal.dealName}`,
          text: `Deal created for lead ${lead.leadName}. Stage: Qualification`,
        });
      }

      res.status(200).json({ message: "Lead converted to deal", deal });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  // 2️⃣ Create Manual Deal
  createManualDeal: async (req, res) => {
    try {
      const { leadId, assignedTo, value, stage, notes } = req.body;

      if (!leadId) return res.status(400).json({ message: "leadId is required" });

      const lead = await Lead.findById(leadId);
      if (!lead) return res.status(404).json({ message: "Lead not found" });

      const allowedStages = [
        "Qualification",
        "Negotiation",
        "Proposal",
        "Closed Won",
        "Closed Lost",
      ];
      const dealStage = stage && allowedStages.includes(stage) ? stage : "Qualification";

      const deal = new Deal({
        leadId,
        dealName: lead.leadName,
        assignedTo,
        value: value || 0,
        stage: dealStage,
        notes: notes || "",
      });
      await deal.save();

      res.status(201).json({ message: "Manual deal created", deal });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  // 3️⃣ Get all deals (UTC-safe + filter)
  getAllDeals: async (req, res) => {
    try {
      const { start, end } = req.query;
      const filter = {};

      if (start || end) {
        filter.createdAt = {};
        if (start) filter.createdAt.$gte = new Date(start);
        if (end) {
          const endDate = new Date(end);
          // include full end day (23:59:59)
          endDate.setHours(23, 59, 59, 999);
          filter.createdAt.$lte = endDate;
        }
      }

      const deals = await Deal.find(filter)
        .populate("assignedTo", "firstName lastName email")
        .populate("leadId", "leadName email")
        .sort({ createdAt: -1 })
        .lean();

      res.status(200).json(deals);
    } catch (err) {
      console.error("Error fetching deals:", err);
      res.status(500).json({ message: err.message });
    }
  },

  // 4️⃣ Update deal stage
  updateStage: async (req, res) => {
    try {
      const { stage } = req.body;
      const allowedStages = [
        "Qualification",
        "Negotiation",
        "Proposal Sent",
        "Closed Won",
        "Closed Lost",
      ];
      if (!allowedStages.includes(stage))
        return res.status(400).json({ message: "Invalid stage" });

      const deal = await Deal.findByIdAndUpdate(
        req.params.id,
        { stage },
        { new: true }
      ).populate("assignedTo", "email");
      if (!deal) return res.status(404).json({ message: "Deal not found" });

      if (deal.assignedTo?._id)
        notifyUser(deal.assignedTo._id.toString(), "deal:stageUpdated", {
          dealId: deal._id,
          newStage: stage,
        });
      if (deal.assignedTo?.email) {
        await sendEmail({
          to: deal.assignedTo.email,
          subject: `Deal Stage Updated: ${deal.dealName}`,
          text: `Deal ${deal.dealName} moved to stage: ${stage}`,
        });
      }

      res.status(200).json(deal);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  // 5️⃣ Update deal fields
  updateDeal: async (req, res) => {
    try {
      const { assignedTo, stage, value, notes, followUpDate } = req.body;
      const allowedStages = [
        "Qualification",
        "Negotiation",
        "Proposal Sent",
        "Closed Won",
        "Closed Lost",
      ];
      if (stage && !allowedStages.includes(stage)) {
        return res.status(400).json({ message: "Invalid stage" });
      }

      const updateFields = {};
      if (assignedTo) updateFields.assignedTo = assignedTo;
      if (stage) updateFields.stage = stage;
      if (value !== undefined) updateFields.value = value;
      if (notes !== undefined) updateFields.notes = notes;
      if (followUpDate !== undefined) updateFields.followUpDate = followUpDate;

      const deal = await Deal.findByIdAndUpdate(req.params.id, updateFields, {
        new: true,
      }).populate("assignedTo", "firstName lastName email");

      if (!deal) return res.status(404).json({ message: "Deal not found" });

      if (assignedTo) {
        notifyUser(assignedTo.toString(), "deal:updated", {
          dealId: deal._id,
          dealName: deal.dealName,
        });
      }
      if (deal.assignedTo?.email) {
        await sendEmail({
          to: deal.assignedTo.email,
          subject: `Deal Updated: ${deal.dealName}`,
          text: `Deal ${deal.dealName} details updated. Stage: ${deal.stage}`,
        });
      }

      res.status(200).json({ message: "Deal updated successfully", deal });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  // 6️⃣ Delete deal
  deleteDeal: async (req, res) => {
    try {
      const deal = await Deal.findByIdAndDelete(req.params.id);
      if (!deal) return res.status(404).json({ message: "Deal not found" });

      res.status(200).json({ message: "Deal deleted successfully" });
    } catch (error) {
      console.error("Delete deal error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  // 7️⃣ Pending deals
  pendingDeals: async (_req, res) => {
    try {
      const deals = await Deal.find({
        stage: { $nin: ["Closed Won", "Closed Lost"] },
      })
        .populate("assignedTo", "firstName lastName email")
        .sort({ createdAt: -1 })
        .limit(10);

      res.status(200).json(deals);
    } catch (error) {
      console.error("Pending deals error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
};
