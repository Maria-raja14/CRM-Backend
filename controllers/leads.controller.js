

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
  
  createLead: async (req, res) => {
  try {
    const { leadName, companyName, assignTo, status } = req.body;

    if (!leadName || !companyName) {
      return res.status(400).json({ message: "Lead name and company name are required" });
    }

    const data = { ...req.body };

    // Handle uploaded files
    if (req.files && req.files.length > 0) {
      data.attachments = req.files.map(file => file.path);
    }

    const lead = new Lead(data);
    const savedLead = await lead.save();
    res.status(201).json(savedLead);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
},
  getLeads: async (_req, res) => {
    try {
      const leads = await Lead.find().populate(
        "assignTo",
        "firstName lastName email role"
      );
      res.status(200).json(leads);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

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

  updateLead: async (req, res) => {
    try {
      const before = await Lead.findById(req.params.id).select(
        "status assignTo leadName followUpDate"
      );
      if (!before) return res.status(404).json({ message: "Lead not found" });

      const patch = { ...req.body };

      // If status changing → recompute followUpDate & clear reminder stamp
      if (patch.status && patch.status !== before.status) {
        const computed = computeFollowUp(patch.status);
        patch.followUpDate = computed || null;
        patch.lastReminderAt = null;
      }

      const updated = await Lead.findByIdAndUpdate(req.params.id, patch, {
        new: true,
      }).populate("assignTo", "firstName lastName email");

      // If status becomes Converted → notify + mail assignee
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

      res.status(200).json(updated);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  deleteLead: async (req, res) => {
    try {
      const lead = await Lead.findByIdAndDelete(req.params.id);
      if (!lead) return res.status(404).json({ message: "Lead not found" });
      res.status(200).json({ message: "Lead deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  updateFollowUpDate: async (req, res) => {
    try {
      const { followUpDate } = req.body;
      if (!followUpDate)
        return res.status(400).json({ message: "followUpDate required" });

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
  


convertLeadToDeal: async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id).populate("assignTo");
    if (!lead) return res.status(404).json({ message: "Lead not found" });
    if (lead.status === "Converted")
      return res.status(400).json({ message: "Lead already converted" });

    const { value, notes } = req.body;

    // 🔹 Store follow-up data before clearing
    const followUpDate = lead.followUpDate;
    const reminderSentAt = lead.lastReminderAt;
    const followUpStatus = lead.followUpStatus || "Pending";
    const followUpFrequencyDays = lead.followUpFrequencyDays || null;

    // 1️⃣ Update lead status to Converted
    lead.status = "Converted";
    lead.followUpDate = null;
    lead.lastReminderAt = null;
    await lead.save();

    // 2️⃣ Create Deal and carry follow-up fields from lead
    const deal = new Deal({
      leadId: lead._id,
      dealName: lead.leadName,
      assignedTo: lead.assignTo?._id,
      value,
      notes,
      stage: "Qualification",

      followUpDate,
      reminderSentAt,
      followUpStatus,
      followUpFrequencyDays,
    });

    await deal.save();

    // 3️⃣ Notify & Email assignee
    const userId = lead.assignTo?._id?.toString();
    if (userId) {
      notifyUser(userId, "deal:created", {
        dealId: deal._id,
        dealName: deal.dealName,
      });
    }

    if (lead.assignTo?.email) {
      await sendEmail({
        to: lead.assignTo.email,
        subject: `New Deal Created: ${deal.dealName}`,
        text: `Deal created for lead ${lead.leadName}. Stage: Qualification`,
      });
    }

    res.status(200).json({ message: "Lead converted to deal", deal });
  } catch (err) {
    console.error("Error converting lead to deal:", err);
    res.status(500).json({ message: err.message });
  }
},
 // ➡️ Get Recent Leads (last 5)
  getRecentLeads: async (_req, res) => {
    try {
      const leads = await Lead.find().sort({ createdAt: -1 }).limit(5)
        .populate("assignTo", "firstName lastName email");
      res.status(200).json(leads);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  // ➡️ Get Pending Leads (not converted)
  getPendingLeads: async (_req, res) => {
    try {
      const leads = await Lead.find({ status: { $ne: "Converted" } })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("assignTo", "firstName lastName email");
      res.status(200).json(leads);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

};


