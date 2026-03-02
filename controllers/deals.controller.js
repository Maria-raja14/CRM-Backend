import Deal from "../models/deals.model.js";
import Lead from "../models/leads.model.js";
import sendEmail from "../services/email.js";
import { notifyUser } from "../realtime/socket.js";
// Import CLV calculation function (adjust path as needed)
import { calculateClientCLV } from "./clientLTVController.js";

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

      // Create Deal – include companyId if lead has it
      const deal = new Deal({
        leadId: lead._id,
        dealName: lead.leadName,
        assignedTo: lead.assignTo?._id,
        stage: "Qualification",
        companyName: lead.companyName,
        companyId: lead.companyId || null, // NEW: store companyId if available
      });
      await deal.save();

      res.status(200).json({ message: "Lead converted to deal", deal });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  // Create Manual Deal Controller with follow-up functionality
  createManualDeal: async (req, res) => {
    try {
      const {
        dealName,
        assignTo,
        dealValue,
        currency,
        stage,
        notes,
        phoneNumber,
        email,
        source,
        companyName,
        companyId, // NEW: accept companyId
        industry,
        requirement,
        address,
        country,
        followUpDate,
        followUpComment,
        lossReason,
        lossNotes,
      } = req.body;

// Create Manual Deal Controller (already correct, but including for reference)
createManualDeal: async (req, res) => {
  try {
    const {
      dealName,
      assignTo,
      dealValue,
      currency,
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
      "Proposal Sent-Negotiation",
      "Invoices Sent",
      "Closed Won",
      "Closed Lost",
    ];

    const dealStage =
      stage && allowedStages.includes(stage) ? stage : "Qualification";

    // Format dealValue with commas
    let formattedValue = "0";
    if (dealValue && currency) {
      const numericValue = Number(dealValue.toString().replace(/,/g, ""));
      if (!isNaN(numericValue)) {
        const withCommas = new Intl.NumberFormat("en-IN").format(numericValue);
        formattedValue = `${withCommas} ${currency}`;
      }

      const allowedStages = [
        "Qualification",
        "Proposal Sent-Negotiation",
        "Invoice Sent",
        "Closed Won",
        "Closed Lost",
      ];

      const dealStage =
        stage && allowedStages.includes(stage) ? stage : "Qualification";

      // Format dealValue with commas
      let formattedValue = "0";
      if (dealValue && currency) {
        const numericValue = Number(dealValue.toString().replace(/,/g, ""));
        if (!isNaN(numericValue)) {
          const withCommas = new Intl.NumberFormat("en-IN").format(numericValue);
          formattedValue = `${withCommas} ${currency}`;
        }
      }

      // Parse follow-up date if provided
      let parsedFollowUpDate = null;
      let followUpHistory = [];
      
      if (followUpDate) {
        parsedFollowUpDate = new Date(followUpDate);
        if (isNaN(parsedFollowUpDate.getTime())) {
          return res.status(400).json({
            message: "Invalid follow-up date format"
          });
        }
        
        followUpHistory = [{
          date: new Date(),
          followUpDate: parsedFollowUpDate,
          followUpComment: followUpComment || "",
          changedBy: req.user._id,
          action: "Created"
        }];
      }

      // Store attachments
      const attachments = req.files ? req.files.map((file) => file.path) : [];

      // Save Deal with follow-up fields and companyId
      const deal = new Deal({
        dealName,
        assignedTo: assignTo || null,
        value: formattedValue,
        stage: dealStage,
        notes: notes || "",
        phoneNumber,
        email,
        source,
        companyName,
        companyId: companyId || null, // NEW
        industry,
        requirement,
        address,
        country,
        attachments,
        followUpDate: parsedFollowUpDate,
        followUpComment: followUpComment || "",
        followUpHistory: followUpHistory,
        lossReason: lossReason || "",
        lossNotes: lossNotes || "",
      });

      await deal.save();
      res.status(201).json({ message: "Manual deal created", deal });
    } catch (err) {
      console.error("Error creating manual deal:", err);
      res.status(500).json({ message: err.message });
    }
  },
  
  getAllDeals: async (req, res) => {
    try {
      let query = {};

      // Role-based filter
      if (req.user.role.name !== "Admin") {
        query.assignedTo = req.user._id;
      }

      // Date range filter
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

  getDealById: async (req, res) => {
    try {
      const dealId = req.params.id;
      
      const deal = await Deal.findById(dealId)
        .populate("assignedTo", "firstName lastName email")
        .populate("followUpHistory.changedBy", "firstName lastName email")
        .populate({
          path: "leadId",
          populate: {
            path: "assignTo",
            select: "firstName lastName email"
          }
        });
      
      if (!deal) {
        return res.status(404).json({ message: "Deal not found" });
      }
      
      // Check if user has permission to view this deal
      if (req.user.role.name !== "Admin" && deal.assignedTo && deal.assignedTo._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Access denied: You can only view deals assigned to you" });
      }
      
      // Get lead attachments if deal was created from a lead
      let leadAttachments = [];
      if (deal.leadId && deal.leadId.attachments) {
        leadAttachments = deal.leadId.attachments;
      }
      
      // Combine lead attachments and deal attachments
      const allAttachments = [
        ...leadAttachments.map(attachment => ({
          name: attachment.split('/').pop(),
          path: attachment,
          type: 'lead'
        })),
        ...(deal.attachments || []).map(attachment => ({
          name: attachment.split('/').pop(),
          path: attachment,
          type: 'deal'
        }))
      ];
      
      // Format response with all required data including follow-up
      const dealData = {
        _id: deal._id,
        dealName: deal.dealName,
        dealTitle: deal.dealTitle,
        value: deal.value,
        stage: deal.stage,
        notes: deal.notes,
        phoneNumber: deal.phoneNumber,
        email: deal.email,
        source: deal.source,
        companyName: deal.companyName,
        companyId: deal.companyId, // NEW
        industry: deal.industry,
        requirement: deal.requirement,
        address: deal.address,
        country: deal.country,
        followUpDate: deal.followUpDate,
        followUpComment: deal.followUpComment,
        followUpHistory: deal.followUpHistory || [],
        lossReason: deal.lossReason,
        lossNotes: deal.lossNotes,
        attachments: allAttachments,
        createdAt: deal.createdAt,
        updatedAt: deal.updatedAt,
        assignedTo: deal.assignedTo ? {
          _id: deal.assignedTo._id,
          firstName: deal.assignedTo.firstName,
          lastName: deal.assignedTo.lastName,
          email: deal.assignedTo.email
        } : null,
        lead: deal.leadId ? {
          _id: deal.leadId._id,
          leadName: deal.leadId.leadName,
          companyName: deal.leadId.companyName,
          email: deal.leadId.email,
          phone: deal.leadId.phone,
          status: deal.leadId.status,
          source: deal.leadId.source,
          country: deal.leadId.country,
          contactPerson: deal.leadId.contactPerson,
          assignTo: deal.leadId.assignTo ? {
            _id: deal.leadId.assignTo._id,
            firstName: deal.leadId.assignTo.firstName,
            lastName: deal.leadId.assignTo.lastName,
            email: deal.leadId.assignTo.email
          } : null
        } : null
      };
      
      res.status(200).json(dealData);
    } catch (err) {
      console.error("Get deal by ID error:", err);
      res.status(500).json({ message: err.message });
    }
  },

  // 3️⃣ Update deal stage
  updateStage: async (req, res) => {
    try {
      const { stage } = req.body;
      const allowedStages = [
        "Qualification",
        "Proposal Sent-Negotiation",
        "Invoice Sent",
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

      const previousStage = deal.stage;
      deal.stage = stage;
      await deal.save();

      // 🔥 If moved to Closed Won, trigger CLV recalculation
      if (stage === "Closed Won" && previousStage !== "Closed Won") {
        // Run in background, don't wait
        calculateClientCLV(deal.companyName).catch(err =>
          console.error("Background CLV recalculation error:", err)
        );
      }

      res.status(200).json(deal);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  updateDeal: async (req, res) => {
    try {
      console.log("Request Body:", req.body);
      console.log("Request Files:", req.files);

      // Parse form data from req.body (it comes as stringified JSON sometimes)
      const {
        dealName,
        dealValue,
        currency,
        stage,
        assignTo,
        notes,
        phoneNumber,
        email,
        source,
        companyName,
        companyId, // NEW
        industry,
        requirement,
        address,
        country,
        existingAttachments,
        followUpDate,
        followUpComment,
        lossReason,
        lossNotes,
      } = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

      const deal = await Deal.findById(req.params.id);
      if (!deal) return res.status(404).json({ message: "Deal not found" });



    // Parse form data from req.body (it comes as stringified JSON sometimes)
    const {
      dealName,
      dealValue,
      currency,
      stage,
      assignTo,
      notes,
      phoneNumber,
      email,
      source,
      companyName,
      industry,
      requirement,
      address,
      country,
      existingAttachments,
    } = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ message: "Deal not found" });

    // Permission check
    if (
      req.user.role.name !== "Admin" &&
      deal.assignedTo?.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Validate stage
    const allowedStages = [
      "Qualification",
      "Proposal Sent-Negotiation",
      "Invoices Sent",
      "Closed Won",
      "Closed Lost",
    ];
    if (stage && !allowedStages.includes(stage)) {
      return res.status(400).json({ message: "Invalid stage" });
    }

    // Build update object
    const updateFields = {
      ...(dealName && { dealName }),
      ...(assignTo && { assignedTo: assignTo }),
      ...(stage && { stage }),
      ...(notes !== undefined && { notes }),
      ...(phoneNumber && { phoneNumber }),
      ...(email && { email }),
      ...(source && { source }),
      ...(companyName && { companyName }),
      ...(industry && { industry }),
      ...(requirement && { requirement }),
      ...(address && { address }),
      ...(country && { country }),
      updatedAt: new Date(),
    };

    // Handle deal value
    if (dealValue !== undefined && dealValue !== null && dealValue !== "") {
      const numericValue = Number(dealValue.toString().replace(/,/g, ""));
      if (!isNaN(numericValue)) {
        const finalCurrency = currency || deal.currency || "INR";
        updateFields.value = `${new Intl.NumberFormat("en-IN").format(
          numericValue
        )} ${finalCurrency}`;
        updateFields.currency = finalCurrency;
      }

      // Validate stage
      const allowedStages = [
        "Qualification",
        "Proposal Sent-Negotiation",
        "Invoice Sent",
        "Closed Won",
        "Closed Lost",
      ];
      if (stage && !allowedStages.includes(stage)) {
        return res.status(400).json({ message: "Invalid stage" });
      }

      // Build update object
      const updateFields = {
        ...(dealName && { dealName }),
        ...(assignTo && { assignedTo: assignTo }),
        ...(stage && { stage }),
        ...(notes !== undefined && { notes }),
        ...(phoneNumber && { phoneNumber }),
        ...(email && { email }),
        ...(source && { source }),
        ...(companyName && { companyName }),
        ...(companyId && { companyId }), // NEW
        ...(industry && { industry }),
        ...(requirement && { requirement }),
        ...(address && { address }),
        ...(country && { country }),
        ...(lossReason !== undefined && { lossReason }),
        ...(lossNotes !== undefined && { lossNotes }),
        updatedAt: new Date(),
      };

      // Handle stage change and auto capture
      if (stage && stage === "Closed Lost" && deal.stage !== "Closed Lost") {
        updateFields.stageLostAt = deal.stage;
        updateFields.lostDate = new Date();
      }

      // If reopening
      if (deal.stage === "Closed Lost" && stage && stage !== "Closed Lost") {
        updateFields.stageLostAt = null;
        updateFields.lostDate = null;
      }

      // Handle deal value
      if (dealValue !== undefined && dealValue !== null && dealValue !== "") {
        const numericValue = Number(dealValue.toString().replace(/,/g, ""));
        if (!isNaN(numericValue)) {
          const finalCurrency = currency || deal.currency || "INR";
          updateFields.value = `${new Intl.NumberFormat("en-IN").format(
            numericValue
          )} ${finalCurrency}`;
          updateFields.currency = finalCurrency;
        }
      }

      // Handle follow-up updates and history tracking
      const oldFollowUpDate = deal.followUpDate;
      const oldFollowUpComment = deal.followUpComment;
      let hasFollowUpChanged = false;

      if (followUpDate !== undefined) {
        let newFollowUpDate = null;
        if (followUpDate) {
          newFollowUpDate = new Date(followUpDate);
          if (isNaN(newFollowUpDate.getTime())) {
            return res.status(400).json({
              message: "Invalid follow-up date format"
            });
          }
        }
        updateFields.followUpDate = newFollowUpDate;
        const oldDateStr = oldFollowUpDate ? oldFollowUpDate.toISOString() : null;
        const newDateStr = newFollowUpDate ? newFollowUpDate.toISOString() : null;
        if (oldDateStr !== newDateStr) {
          hasFollowUpChanged = true;
        }
      }

      if (followUpComment !== undefined) {
        updateFields.followUpComment = followUpComment;
        if (oldFollowUpComment !== followUpComment) {
          hasFollowUpChanged = true;
        }
      }

      if (hasFollowUpChanged) {
        const historyEntry = {
          date: new Date(),
          followUpDate: updateFields.followUpDate || null,
          followUpComment: updateFields.followUpComment || "",
          changedBy: req.user._id,
          action: oldFollowUpDate ? "Updated" : "Created"
        };
        updateFields.followUpHistory = [
          ...(deal.followUpHistory || []),
          historyEntry
        ];
      }

      // Handle attachments
      let finalAttachments = [];

      if (existingAttachments) {
        try {
          finalAttachments = typeof existingAttachments === "string" 
            ? JSON.parse(existingAttachments) 
            : existingAttachments;
        } catch (err) {
          console.error("Error parsing existingAttachments:", err);
          finalAttachments = deal.attachments || [];
        }
      } else {
        finalAttachments = deal.attachments || [];
      }

      if (req.files && req.files.length > 0) {
        const newAttachments = req.files.map((file) => file.path);
        finalAttachments = [...finalAttachments, ...newAttachments];
      }

      updateFields.attachments = finalAttachments;

      const updatedDeal = await Deal.findByIdAndUpdate(
        req.params.id,
        updateFields,
        { new: true }
      )
      .populate("assignedTo", "firstName lastName email")
      .populate("followUpHistory.changedBy", "firstName lastName email");

      // 🔥 If stage changed to Closed Won, trigger CLV recalculation
      if (stage === "Closed Won" && deal.stage !== "Closed Won") {
        // Use the updated deal's companyName
        calculateClientCLV(updatedDeal.companyName).catch(err =>
          console.error("Background CLV recalculation error:", err)
        );
      }

      res.status(200).json({
        message: "Deal updated successfully",
        deal: updatedDeal,
      });
    } catch (err) {
      console.error("Update deal error:", err);
      res.status(500).json({ message: err.message });
    }
  },

  // Mark follow-up as completed
  completeFollowUp: async (req, res) => {
    try {
      const { id } = req.params;
      const { outcome, notes } = req.body;

      const deal = await Deal.findById(id);
      if (!deal) {
        return res.status(404).json({ message: "Deal not found" });
      }

      // Permission check
      if (
        req.user.role.name !== "Admin" &&
        deal.assignedTo?.toString() !== req.user._id.toString()
      ) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (!deal.followUpDate) {
        return res.status(400).json({ message: "No active follow-up to complete" });
      }

      const historyEntry = {
        date: new Date(),
        followUpDate: deal.followUpDate,
        followUpComment: deal.followUpComment,
        changedBy: req.user._id,
        action: "Completed",
        outcome: outcome || "Completed",
        notes: notes || ""
      };

      const updateFields = {
        followUpDate: null,
        followUpComment: "",
        followUpHistory: [...(deal.followUpHistory || []), historyEntry],
        updatedAt: new Date()
      };

      const updatedDeal = await Deal.findByIdAndUpdate(
        id,
        updateFields,
        { new: true }
      )
      .populate("assignedTo", "firstName lastName email")
      .populate("followUpHistory.changedBy", "firstName lastName email");

      res.status(200).json({
        message: "Follow-up completed successfully",
        deal: updatedDeal,
      });
    } catch (err) {
      console.error("Complete follow-up error:", err);
      res.status(500).json({ message: err.message });
    }
  },

  deleteDeal: async (req, res) => {
    try {
      const { id } = req.params;

      const deal = await Deal.findById(id);
      if (!deal) {
        return res.status(404).json({ message: "Deal not found" });
      }

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