import Lead from "../models/leads.model.js";

export default {
  createLead: async (req, res) => {
    try {
      const lead = new Lead(req.body);
      const savedLead = await lead.save();
      res.status(201).json(savedLead);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  getLeads: async (req, res) => {
    try {
      const leads = await Lead.find().populate("assignTo", "name email");
      res.status(200).json(leads);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Update a role
  getLeadById: async (req, res) => {
    try {
      const lead = await Lead.findById(req.params.id).populate(
        "assignTo",
        "name email"
      );
      if (!lead) return res.status(404).json({ message: "Lead not found" });
      res.status(200).json(lead);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Get Users by Role Name
  updateLead: async (req, res) => {
    try {
      const lead = await Lead.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
      });
      if (!lead) return res.status(404).json({ message: "Lead not found" });
      res.status(200).json(lead);
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
};
