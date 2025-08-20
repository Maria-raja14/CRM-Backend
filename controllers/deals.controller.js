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
      if (lead.status === "Converted") return res.status(400).json({ message: "Lead already converted" });

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
      if (userId) notifyUser(userId, "deal:created", { dealId: deal._id, dealName: deal.dealName });
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
      const { dealName, assignedTo, value, stage, notes } = req.body;

      if (!dealName) return res.status(400).json({ message: "dealName is required" });

      const allowedStages = ["Qualification", "Negotiation", "Proposal Sent", "Closed Won", "Closed Lost"];
      const dealStage = stage && allowedStages.includes(stage) ? stage : "Qualification";

      const deal = new Deal({
        dealName,
        assignedTo,
        value: value || 0,
        stage: dealStage,
        notes: notes || "",
      });

      await deal.save();

      // Notify + email if assigned
      if (assignedTo) {
        notifyUser(assignedTo.toString(), "deal:created", { dealId: deal._id, dealName: deal.dealName });
      }

      res.status(201).json({ message: "Manual deal created", deal });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  // 2️⃣ Get all deals
  getAllDeals: async (_req, res) => {
    try {
      const deals = await Deal.find().populate("assignedTo", "firstName lastName email");
      res.status(200).json(deals);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  // 3️⃣ Update deal stage
  updateStage: async (req, res) => {
    try {
      const { stage } = req.body;
      const allowedStages = ["Qualification", "Negotiation", "Proposal Sent", "Closed Won", "Closed Lost"];
      if (!allowedStages.includes(stage)) return res.status(400).json({ message: "Invalid stage" });

      const deal = await Deal.findByIdAndUpdate(req.params.id, { stage }, { new: true }).populate("assignedTo", "email");
      if (!deal) return res.status(404).json({ message: "Deal not found" });

      // Notify + Email
      if (deal.assignedTo?._id) notifyUser(deal.assignedTo._id.toString(), "deal:stageUpdated", { dealId: deal._id, newStage: stage });
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
};
