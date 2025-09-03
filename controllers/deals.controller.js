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

      // Update lead status
      lead.status = "Converted";
      lead.followUpDate = null;
      lead.lastReminderAt = null;
      await lead.save();

      // Create Deal
      const deal = new Deal({
        leadId: lead._id,
        dealName: lead.leadName,
        assignedTo: lead.assignTo?._id,
        stage: "Qualification",
      });
      await deal.save();

      // Notify + Email
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

  createManualDeal: async (req, res) => {
    try {
      const {
        dealName,
        assignTo, // frontend sends assignTo
        dealValue, // frontend sends dealValue
        stage,
        notes,
        phoneNumber,
        email,
        source,
        companyName,
        industry,
        requirement,
        address,
        country,
      } = req.body;

      // Validation
      if (!dealName || !phoneNumber || !companyName) {
        return res.status(400).json({
          message: "dealName, phoneNumber & companyName are required",
        });
      }

      const allowedStages = [
        "Qualification",
        "Negotiation",
        "Proposal Sent",
        "Closed Won",
        "Closed Lost",
      ];

      const dealStage =
        stage && allowedStages.includes(stage) ? stage : "Qualification";

      // Store attachments as array of paths
      const attachments = req.files ? req.files.map((file) => file.path) : [];

      // Map frontend fields to backend schema
      const deal = new Deal({
        dealName,
        assignedTo: assignTo || null, // map assignTo to assignedTo
        value: Number(dealValue) || 0, // map dealValue to value
        stage: dealStage,
        notes: notes || "",
        phoneNumber,
        email,
        source,
        companyName,
        industry,
        requirement,
        address,
        country,
        attachments,
      });

      await deal.save();
      res.status(201).json({ message: "Manual deal created", deal });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err.message });
    }
  },

  // 2️⃣ Get all deals - Updated to filter by user role
  getAllDeals: async (req, res) => {
    try {
      let query = {};

      // If user is not admin, only show deals assigned to them
      if (req.user.role.name !== "Admin") {
        query.assignedTo = req.user._id;
      }

      const deals = await Deal.find(query)
        .populate("assignedTo", "firstName lastName email")

        .sort({ createdAt: -1 }); // optional: newest deals first

      res.status(200).json(deals);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err.message });
    }
  },

  // 3️⃣ Update deal stage
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

      const deal = await Deal.findById(req.params.id).populate(
        "assignedTo",
        "email"
      );
      if (!deal) return res.status(404).json({ message: "Deal not found" });

      // Check if user has permission to update this deal
      if (
        req.user.role.name !== "Admin" &&
        deal.assignedTo._id.toString() !== req.user._id.toString()
      ) {
        return res.status(403).json({
          message: "Access denied: You can only update deals assigned to you",
        });
      }

      deal.stage = stage;
      await deal.save();

      // Notify + Email
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

  updateDeal: async (req, res) => {
    try {
      const { assignedTo, stage, value, notes, followUpDate } = req.body;

      // Find the deal first to check permissions
      const deal = await Deal.findById(req.params.id);
      if (!deal) return res.status(404).json({ message: "Deal not found" });

      // Check if user has permission to update this deal
      if (
        req.user.role.name !== "Admin" &&
        deal.assignedTo.toString() !== req.user._id.toString()
      ) {
        return res.status(403).json({
          message: "Access denied: You can only update deals assigned to you",
        });
      }

      // Allowed stages list
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

      // Update only editable fields
      const updateFields = {};
      if (assignedTo) updateFields.assignedTo = assignedTo;
      if (stage) updateFields.stage = stage;
      if (value !== undefined) updateFields.value = value;
      if (notes !== undefined) updateFields.notes = notes;
      if (followUpDate !== undefined) updateFields.followUpDate = followUpDate;

      const updatedDeal = await Deal.findByIdAndUpdate(
        req.params.id,
        updateFields,
        { new: true }
      ).populate("assignedTo", "firstName lastName email");

      // 🔔 Notify + Email
      if (assignedTo) {
        notifyUser(assignedTo.toString(), "deal:updated", {
          dealId: updatedDeal._id,
          dealName: updatedDeal.dealName,
        });
      }
      if (updatedDeal.assignedTo?.email) {
        await sendEmail({
          to: updatedDeal.assignedTo.email,
          subject: `Deal Updated: ${updatedDeal.dealName}`,
          text: `Deal ${updatedDeal.dealName} details have been updated. Current Stage: ${updatedDeal.stage}`,
        });
      }

      res
        .status(200)
        .json({ message: "Deal updated successfully", deal: updatedDeal });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  deleteDeal: async (req, res) => {
    try {
      const { id } = req.params;

      // Find the deal first to check permissions
      const deal = await Deal.findById(id);
      if (!deal) {
        return res.status(404).json({ message: "Deal not found" });
      }

      // Check if user has permission to delete this deal
      if (
        req.user.role.name !== "Admin" &&
        deal.assignedTo.toString() !== req.user._id.toString()
      ) {
        return res.status(403).json({
          message: "Access denied: You can only delete deals assigned to you",
        });
      }

      await Deal.findByIdAndDelete(id);

      res.status(200).json({ message: "Deal deleted successfully" });
    } catch (error) {
      console.error("Delete deal error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
  pendingDeals: async (req, res) => {
    try {
      let query = {
        stage: { $nin: ["Closed Won", "Closed Lost"] },
      };

      // If user is not admin, only show deals assigned to them
      if (req.user.role.name !== "Admin") {
        query.assignedTo = req.user._id;
      }

      // Fetch deals which are not yet closed
      const deals = await Deal.find(query)
        .populate("assignedTo", "firstName lastName email")
        .sort({ createdAt: -1 })
        .limit(10); // limit to recent 10 pending deals

      res.status(200).json(deals);
    } catch (error) {
      console.error("Pending deals error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
}; //with sales perimission