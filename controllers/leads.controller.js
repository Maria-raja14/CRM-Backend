// import Lead from "../models/leads.model.js";
// import userModel from "../models/user.model.js";

// export default {
//  createLead: async (req, res) => {
//   try {
//     const { leadName, companyName, assignTo } = req.body;
    
//     if (!leadName || !companyName) {
//       return res.status(400).json({ message: "Lead name and company name are required" });
//     }

//     // If assignTo is provided, validate user exists
//     if (assignTo) {
//       const userExists = await userModel.findById(assignTo);
//       if (!userExists) {
//         return res.status(400).json({ message: "Assigned user not found" });
//       }
//     }

//     const lead = new Lead(req.body);
//     const savedLead = await lead.save();
//     res.status(201).json(savedLead);
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// },


//   getLeads: async (req, res) => {
//     try {
//       const leads = await Lead.find().populate("assignTo", "name email");
//       res.status(200).json(leads);
//     } catch (error) {
//       res.status(500).json({ message: error.message });
//     }
//   },

//   // Update a role
//   getLeadById: async (req, res) => {
//     try {
//       const lead = await Lead.findById(req.params.id).populate(
//         "assignTo",
//         "name email"
//       );
//       if (!lead) return res.status(404).json({ message: "Lead not found" });
//       res.status(200).json(lead);
//     } catch (error) {
//       res.status(500).json({ message: error.message });
//     }
//   },

//   // Get Users by Role Name
//   updateLead: async (req, res) => {
//     try {
//       const lead = await Lead.findByIdAndUpdate(req.params.id, req.body, {
//         new: true,
//       });
//       if (!lead) return res.status(404).json({ message: "Lead not found" });
//       res.status(200).json(lead);
//     } catch (error) {
//       res.status(400).json({ message: error.message });
//     }
//   },

//   deleteLead: async (req, res) => {
//     try {
//       const lead = await Lead.findByIdAndDelete(req.params.id);
//       if (!lead) return res.status(404).json({ message: "Lead not found" });
//       res.status(200).json({ message: "Lead deleted successfully" });
//     } catch (error) {
//       res.status(500).json({ message: error.message });
//     }
//   },
// };




import Lead from "../models/leads.model.js";
import userModel from "../models/user.model.js";
import dayjs from "dayjs";
import { notifyUser } from "../realtime/socket.js";   // (step 4-la create panrom)
import { sendEmail } from "../services/email.js";      // (step 5-la create panrom)

export default {
  createLead: async (req, res) => {
    try {
      const { leadName, companyName, assignTo } = req.body;

      if (!leadName || !companyName) {
        return res.status(400).json({ message: "Lead name and company name are required" });
      }

      if (assignTo) {
        const userExists = await userModel.findById(assignTo);
        if (!userExists) {
          return res.status(400).json({ message: "Assigned user not found" });
        }
      }

      const lead = new Lead(req.body);
      const savedLead = await lead.save();
      res.status(201).json(savedLead);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  getLeads: async (_req, res) => {
    try {
      const leads = await Lead.find()
        .populate("assignTo", "firstName lastName email role");
      res.status(200).json(leads);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  getLeadById: async (req, res) => {
    try {
      const lead = await Lead.findById(req.params.id)
        .populate("assignTo", "firstName lastName email role");
      if (!lead) return res.status(404).json({ message: "Lead not found" });
      res.status(200).json(lead);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  updateLead: async (req, res) => {
    try {
      const before = await Lead.findById(req.params.id).select("status assignTo leadName followUpDate");
      if (!before) return res.status(404).json({ message: "Lead not found" });

      const updated = await Lead.findByIdAndUpdate(req.params.id, req.body, { new: true })
        .populate("assignTo", "firstName lastName email");

      // If status becomes Converted → notify
      if (before.status !== "Converted" && updated.status === "Converted") {
        const userId = updated.assignTo?._id?.toString();
        const fullName = `${updated.assignTo?.firstName || ""} ${updated.assignTo?.lastName || ""}`.trim();

        // real-time popup
        if (userId) {
          notifyUser(userId, "deal:converted", {
            leadId: updated._id,
            leadName: updated.leadName,
            when: new Date(),
          });
        }

        // email (optional)
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

  // Optional: update only next follow-up
  updateFollowUpDate: async (req, res) => {
    try {
      const { followUpDate } = req.body;
      if (!followUpDate) return res.status(400).json({ message: "followUpDate required" });

      const lead = await Lead.findByIdAndUpdate(
        req.params.id,
        { followUpDate, lastReminderAt: null }, // reset reminder stamp
        { new: true }
      );
      if (!lead) return res.status(404).json({ message: "Lead not found" });

      res.status(200).json(lead);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },
};
