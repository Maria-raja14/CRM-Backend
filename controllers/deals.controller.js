

import Deal from "../models/deals.model.js";
import Lead from "../models/leads.model.js";
import sendEmail from "../services/email.js";
import { notifyUser } from "../realtime/socket.js";

// ─────────────────────────────────────────────────────────────
// Helper: convert a multer file object → attachment schema object
// path saved WITHOUT leading slash: "uploads/deals/xyz.pdf"
// ─────────────────────────────────────────────────────────────
const mapFileToAttachment = (file) => ({
  name:       file.originalname,
  path:       file.path.replace(/\\/g, "/").replace(/^\/+/, ""), // normalize + strip leading /
  type:       file.mimetype,
  size:       file.size,
  uploadedAt: new Date(),
});

// ─────────────────────────────────────────────────────────────
// Helper: normalize any attachment to object form
// Handles BOTH old flat-string format AND new object format
// so old data in MongoDB still works after the schema upgrade
// ─────────────────────────────────────────────────────────────
const normalizeAttachment = (att) => {
  if (!att) return null;

  // Legacy flat string: "uploads/deals/file.pdf" or "/uploads/deals/file.pdf"
  if (typeof att === "string") {
    const cleanPath = att.replace(/^\/+/, ""); // strip leading slash
    return {
      name:       cleanPath.split("/").pop() || "file",
      path:       cleanPath,
      type:       "application/octet-stream",
      size:       0,
      uploadedAt: new Date(),
    };
  }

  // Already an object — just ensure path has no leading slash
  return {
    _id:        att._id,
    name:       att.name || att.path?.split("/").pop() || "file",
    path:       (att.path || "").replace(/^\/+/, ""),
    type:       att.type || "application/octet-stream",
    size:       att.size || 0,
    uploadedAt: att.uploadedAt || new Date(),
  };
};

// ─────────────────────────────────────────────────────────────
// Helper: format deal value as "1,00,000 INR"
// ─────────────────────────────────────────────────────────────
const formatDealValue = (dealValue, currency = "INR") => {
  const numeric = Number(String(dealValue).replace(/,/g, ""));
  if (isNaN(numeric)) return "0";
  return `${new Intl.NumberFormat("en-IN").format(numeric)} ${currency}`;
};

export default {

  // ─────────────────────────────────────────────
  // 1. Convert Lead → Deal
  // ─────────────────────────────────────────────
  createDealFromLead: async (req, res) => {
    try {
      const lead = await Lead.findById(req.params.leadId).populate("assignTo");
      if (!lead) return res.status(404).json({ message: "Lead not found" });
      if (lead.status === "Converted")
        return res.status(400).json({ message: "Lead already converted" });

      lead.status         = "Converted";
      lead.followUpDate   = null;
      lead.lastReminderAt = null;
      await lead.save();

      const deal = new Deal({
        leadId:     lead._id,
        dealName:   lead.leadName,
        assignedTo: lead.assignTo?._id,
        stage:      "Qualification",
        value:      "0",
      });
      await deal.save();

      res.status(200).json({ message: "Lead converted to deal", deal });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  // ─────────────────────────────────────────────
  // 2. Create Manual Deal
  // ✅ FIXED: attachments saved as objects {name,path,type,size}
  //           not flat strings like file.path
  // ─────────────────────────────────────────────
  createManualDeal: async (req, res) => {
    try {
      const {
        dealName, assignTo, dealValue, currency, stage,
        notes, phoneNumber, email, source, companyName,
        industry, requirement, address, country,
      } = req.body;

      if (!dealName || !phoneNumber || !companyName) {
        return res.status(400).json({
          message: "dealName, phoneNumber & companyName are required",
        });
      }

      const allowedStages = [
        "Qualification", "Negotiation", "Proposal",
        "Proposal Sent", "Closed Won", "Closed Lost",
      ];
      const dealStage = stage && allowedStages.includes(stage) ? stage : "Qualification";

      const formattedValue = dealValue && currency
        ? formatDealValue(dealValue, currency)
        : "0";

      // ✅ FIXED: map to objects, not flat strings
      const attachments = (req.files || []).map(mapFileToAttachment);

      const deal = new Deal({
        dealName,
        assignedTo:  assignTo || null,
        value:       formattedValue,
        currency:    currency || "INR",
        stage:       dealStage,
        notes:       notes || "",
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
      console.error("Error creating manual deal:", err);
      res.status(500).json({ message: err.message });
    }
  },

  // ─────────────────────────────────────────────
  // 3. Get All Deals
  // ─────────────────────────────────────────────
  getAllDeals: async (req, res) => {
    try {
      let query = {};
      if (req.user.role.name !== "Admin") {
        query.assignedTo = req.user._id;
      }

      const { start, end } = req.query;
      if (start && end) {
        query.createdAt = {
          $gte: new Date(start),
          $lte: new Date(end + "T23:59:59.999Z"),
        };
      }

      const deals = await Deal.find(query)
        .populate("assignedTo", "firstName lastName email")
        .sort({ createdAt: -1 });

      res.status(200).json(deals);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err.message });
    }
  },

  // ─────────────────────────────────────────────
  // 4. Get Deal By ID
  // ✅ FIXED: normalizeAttachment handles both old string[] and new object[]
  // ✅ FIXED: lead attachments handled as objects too (leads model uses objects)
  // ─────────────────────────────────────────────
  getDealById: async (req, res) => {
    try {
      const deal = await Deal.findById(req.params.id)
        .populate("assignedTo", "firstName lastName email")
        .populate({
          path:     "leadId",
          populate: { path: "assignTo", select: "firstName lastName email" },
        });

      if (!deal)
        return res.status(404).json({ message: "Deal not found" });

      if (
        req.user.role.name !== "Admin" &&
        deal.assignedTo?._id.toString() !== req.user._id.toString()
      ) {
        return res.status(403).json({
          message: "Access denied: You can only view deals assigned to you",
        });
      }

      // ✅ Lead attachments — normalize (supports both old strings and new objects)
      const leadAttachments = (deal.leadId?.attachments || [])
        .map(normalizeAttachment)
        .filter(Boolean)
        .map((att) => ({ ...att, source: "lead" }));

      // ✅ Deal attachments — normalize (supports both old strings and new objects)
      const dealAttachments = (deal.attachments || [])
        .map(normalizeAttachment)
        .filter(Boolean)
        .map((att) => ({ ...att, source: "deal" }));

      const dealData = {
        _id:            deal._id,
        dealName:       deal.dealName,
        dealTitle:      deal.dealTitle,
        value:          deal.value,
        currency:       deal.currency,
        stage:          deal.stage,
        notes:          deal.notes,
        phoneNumber:    deal.phoneNumber,
        email:          deal.email,
        source:         deal.source,
        companyName:    deal.companyName,
        industry:       deal.industry,
        requirement:    deal.requirement,
        address:        deal.address,
        country:        deal.country,
        followUpDate:   deal.followUpDate,
        followUpStatus: deal.followUpStatus,
        // Lead attachments first, then deal attachments
        attachments:    [...leadAttachments, ...dealAttachments],
        createdAt:      deal.createdAt,
        updatedAt:      deal.updatedAt,
        assignedTo: deal.assignedTo
          ? {
              _id:       deal.assignedTo._id,
              firstName: deal.assignedTo.firstName,
              lastName:  deal.assignedTo.lastName,
              email:     deal.assignedTo.email,
            }
          : null,
        lead: deal.leadId
          ? {
              _id:         deal.leadId._id,
              leadName:    deal.leadId.leadName,
              companyName: deal.leadId.companyName,
              email:       deal.leadId.email,
              status:      deal.leadId.status,
              source:      deal.leadId.source,
              country:     deal.leadId.country,
              assignTo: deal.leadId.assignTo
                ? {
                    _id:       deal.leadId.assignTo._id,
                    firstName: deal.leadId.assignTo.firstName,
                    lastName:  deal.leadId.assignTo.lastName,
                    email:     deal.leadId.assignTo.email,
                  }
                : null,
            }
          : null,
      };

      res.status(200).json(dealData);
    } catch (err) {
      console.error("Get deal by ID error:", err);
      res.status(500).json({ message: err.message });
    }
  },

  // ─────────────────────────────────────────────
  // 5. Update Stage
  // ─────────────────────────────────────────────
  updateStage: async (req, res) => {
    try {
      const { stage } = req.body;
      const allowedStages = [
        "Qualification", "Negotiation", "Proposal",
        "Proposal Sent", "Closed Won", "Closed Lost",
      ];
      if (!allowedStages.includes(stage))
        return res.status(400).json({ message: "Invalid stage" });

      const deal = await Deal.findById(req.params.id).populate("assignedTo", "email");
      if (!deal) return res.status(404).json({ message: "Deal not found" });

      if (
        req.user.role.name !== "Admin" &&
        deal.assignedTo._id.toString() !== req.user._id.toString()
      ) {
        return res.status(403).json({ message: "Access denied" });
      }

      deal.stage = stage;
      await deal.save();
      res.status(200).json(deal);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  // ─────────────────────────────────────────────
  // 6. Update Deal
  // ✅ FIXED: new files mapped to objects, existing normalized
  // ─────────────────────────────────────────────
  updateDeal: async (req, res) => {
    try {
      const {
        dealName, dealValue, currency, stage, assignTo,
        notes, phoneNumber, email, source, companyName,
        industry, requirement, address, country,
        existingAttachments,
      } = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

      const deal = await Deal.findById(req.params.id);
      if (!deal) return res.status(404).json({ message: "Deal not found" });

      if (
        req.user.role.name !== "Admin" &&
        deal.assignedTo?.toString() !== req.user._id.toString()
      ) {
        return res.status(403).json({ message: "Access denied" });
      }

      const allowedStages = [
        "Qualification", "Negotiation", "Proposal",
        "Proposal Sent", "Closed Won", "Closed Lost",
      ];
      if (stage && !allowedStages.includes(stage)) {
        return res.status(400).json({ message: "Invalid stage" });
      }

      const updateFields = {
        ...(dealName    && { dealName }),
        ...(assignTo    && { assignedTo: assignTo }),
        ...(stage       && { stage }),
        ...(notes       !== undefined && { notes }),
        ...(phoneNumber && { phoneNumber }),
        ...(email       && { email }),
        ...(source      && { source }),
        ...(companyName && { companyName }),
        ...(industry    && { industry }),
        ...(requirement && { requirement }),
        ...(address     && { address }),
        ...(country     && { country }),
        updatedAt: new Date(),
      };

      // Format deal value
      if (dealValue !== undefined && dealValue !== null && dealValue !== "") {
        const finalCurrency = currency || deal.currency || "INR";
        updateFields.value    = formatDealValue(dealValue, finalCurrency);
        updateFields.currency = finalCurrency;
      }

      // ── Handle attachments ──────────────────────────────────────
      // existingAttachments = what the frontend wants to keep (may be objects or strings)
      // req.files           = newly uploaded files
      let keptAttachments = [];

      if (existingAttachments !== undefined) {
        try {
          const parsed = typeof existingAttachments === "string"
            ? JSON.parse(existingAttachments)
            : existingAttachments;
          keptAttachments = (Array.isArray(parsed) ? parsed : [])
            .map(normalizeAttachment)
            .filter(Boolean);
        } catch (err) {
          console.error("Error parsing existingAttachments:", err);
          keptAttachments = (deal.attachments || []).map(normalizeAttachment).filter(Boolean);
        }
      } else {
        keptAttachments = (deal.attachments || []).map(normalizeAttachment).filter(Boolean);
      }

      // Map new uploaded files → objects
      const newAttachments = (req.files || []).map(mapFileToAttachment);
      updateFields.attachments = [...keptAttachments, ...newAttachments];

      const updatedDeal = await Deal.findByIdAndUpdate(
        req.params.id,
        updateFields,
        { new: true }
      ).populate("assignedTo", "firstName lastName email");

      res.status(200).json({ message: "Deal updated successfully", deal: updatedDeal });
    } catch (err) {
      console.error("Update deal error:", err);
      res.status(500).json({ message: err.message });
    }
  },

  // ─────────────────────────────────────────────
  // 7. Delete Deal
  // ─────────────────────────────────────────────
  deleteDeal: async (req, res) => {
    try {
      const deal = await Deal.findById(req.params.id);
      if (!deal) return res.status(404).json({ message: "Deal not found" });

      if (
        req.user.role.name !== "Admin" &&
        deal.assignedTo.toString() !== req.user._id.toString()
      ) {
        return res.status(403).json({ message: "Access denied" });
      }

      await Deal.findByIdAndDelete(req.params.id);
      res.status(200).json({ message: "Deal deleted successfully" });
    } catch (error) {
      console.error("Delete deal error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },



  

  bulkDeleteDeals: async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "No deal IDs provided" });
    }

    const roleName = req.user.role.name?.toLowerCase();

    // ✅ FIXED: Both Admin and Sales can bulk delete
    // Admin can delete any deals
    // Sales can only delete deals assigned to them
    let query = { _id: { $in: ids } };

    if (roleName === "sales") {
      // Restrict Sales to only delete their own assigned deals
      query.assignedTo = req.user._id;
    }

    const result = await Deal.deleteMany(query);

    res.status(200).json({
      message: `${result.deletedCount} deal(s) deleted successfully`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Bulk delete error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
},

  // ─────────────────────────────────────────────
  // 8. Pending Deals
  // ─────────────────────────────────────────────
  pendingDeals: async (req, res) => {
    try {
      let query = { stage: { $nin: ["Closed Won", "Closed Lost"] } };
      if (req.user.role.name !== "Admin") {
        query.assignedTo = req.user._id;
      }
      const deals = await Deal.find(query)
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