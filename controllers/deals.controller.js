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

//       res.status(200).json({ message: "Lead converted to deal", deal });
//     } catch (err) {
//       res.status(500).json({ message: err.message });
//     }
//   },

//   createManualDeal: async (req, res) => {
//     try {
//       const {
//         dealName,
//         assignTo,
//         dealValue,
//         currency, // ✅ frontend is already sending this
//         stage,
//         notes,
//         phoneNumber,
//         email,
//         source,
//         companyName,
//         industry,
//         requirement,
//         address,
//         country,
//       } = req.body;

//       // Validation
//       if (!dealName || !phoneNumber || !companyName) {
//         return res.status(400).json({
//           message: "dealName, phoneNumber & companyName are required",
//         });
//       }

//       const allowedStages = [
//         "Qualification",
//         "Negotiation",
//         "Proposal Sent",
//         "Closed Won",
//         "Closed Lost",
//       ];

//       const dealStage =
//         stage && allowedStages.includes(stage) ? stage : "Qualification";

//       // ✅ Format dealValue with commas
//       let formattedValue = null;
//       if (dealValue && currency) {
//         const numericValue = Number(dealValue.toString().replace(/,/g, "")); // remove commas
//         const withCommas = new Intl.NumberFormat("en-US").format(numericValue);
//         formattedValue = `${withCommas} ${currency}`; // e.g. "1,211,111 INR"
//       }

//       // Store attachments
//       const attachments = req.files ? req.files.map((file) => file.path) : [];

//       // Save Deal
//       const deal = new Deal({
//         dealName,
//         assignedTo: assignTo || null,
//         value: formattedValue || "0", // ✅ properly formatted value
//         stage: dealStage,
//         notes: notes || "",
//         phoneNumber,
//         email,
//         source,
//         companyName,
//         industry,
//         requirement,
//         address,
//         country,
//         attachments,
//       });

//       await deal.save();
//       res.status(201).json({ message: "Manual deal created", deal });
//     } catch (err) {
//       console.error("Error creating manual deal:", err);
//       res.status(500).json({ message: err.message });
//     }
//   },

//   getAllDeals: async (req, res) => {
//     try {
//       let query = {};

//       // Role-based filter
//       if (req.user.role.name !== "Admin") {
//         query.assignedTo = req.user._id;
//       }

//       // Date range filter
//       const { start, end } = req.query;
//       if (start && end) {
//         query.createdAt = {
//           $gte: new Date(start),
//           $lte: new Date(end + "T23:59:59.999Z"),
//         };
//       }

//       const deals = await Deal.find(query)
//         .populate("assignedTo", "firstName lastName email")
//         .sort({ createdAt: -1 });

//       res.status(200).json(deals);
//     } catch (err) {
//       console.error(err);
//       res.status(500).json({ message: err.message });
//     }
//   },

//   getDealById: async (req, res) => {
//     try {
//       const dealId = req.params.id;

//       const deal = await Deal.findById(dealId)
//         .populate("assignedTo", "firstName lastName email")
//         .populate({
//           path: "leadId",
//           populate: {
//             path: "assignTo",
//             select: "firstName lastName email",
//           },
//         });

//       if (!deal) {
//         return res.status(404).json({ message: "Deal not found" });
//       }

//       // Check if user has permission to view this deal
//       if (
//         req.user.role.name !== "Admin" &&
//         deal.assignedTo._id.toString() !== req.user._id.toString()
//       ) {
//         return res
//           .status(403)
//           .json({
//             message: "Access denied: You can only view deals assigned to you",
//           });
//       }

//       // Get lead attachments if deal was created from a lead
//       let leadAttachments = [];
//       if (deal.leadId && deal.leadId.attachments) {
//         leadAttachments = deal.leadId.attachments;
//       }

//       // Combine lead attachments and deal attachments
//       const allAttachments = [
//         ...leadAttachments.map((attachment) => ({
//           name: attachment.split("/").pop(),
//           path: attachment,
//           type: "lead",
//         })),
//         ...(deal.attachments || []).map((attachment) => ({
//           name: attachment.split("/").pop(),
//           path: attachment,
//           type: "deal",
//         })),
//       ];

//       // Format response with all required data
//       const dealData = {
//         _id: deal._id,
//         dealName: deal.dealName,
//         dealTitle: deal.dealTitle,
//         value: deal.value,
//         stage: deal.stage,
//         notes: deal.notes,
//         phoneNumber: deal.phoneNumber,
//         email: deal.email,
//         source: deal.source,
//         companyName: deal.companyName,
//         industry: deal.industry,
//         requirement: deal.requirement,
//         address: deal.address,
//         country: deal.country,
//         followUpDate: deal.followUpDate,
//         followUpStatus: deal.followUpStatus,
//         attachments: allAttachments,
//         createdAt: deal.createdAt,
//         updatedAt: deal.updatedAt,
//         assignedTo: deal.assignedTo
//           ? {
//               _id: deal.assignedTo._id,
//               firstName: deal.assignedTo.firstName,
//               lastName: deal.assignedTo.lastName,
//               email: deal.assignedTo.email,
//             }
//           : null,
//         lead: deal.leadId
//           ? {
//               _id: deal.leadId._id,
//               leadName: deal.leadId.leadName,
//               companyName: deal.leadId.companyName,
//               email: deal.leadId.email,
//               phone: deal.leadId.phone,
//               status: deal.leadId.status,
//               source: deal.leadId.source,
//               country: deal.leadId.country,
//               contactPerson: deal.leadId.contactPerson,
//               assignTo: deal.leadId.assignTo
//                 ? {
//                     _id: deal.leadId.assignTo._id,
//                     firstName: deal.leadId.assignTo.firstName,
//                     lastName: deal.leadId.assignTo.lastName,
//                     email: deal.leadId.assignTo.email,
//                   }
//                 : null,
//             }
//           : null,
//       };

//       res.status(200).json(dealData);
//     } catch (err) {
//       console.error("Get deal by ID error:", err);
//       res.status(500).json({ message: err.message });
//     }
//   }, //ok

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

//       const deal = await Deal.findById(req.params.id).populate(
//         "assignedTo",
//         "email"
//       );
//       if (!deal) return res.status(404).json({ message: "Deal not found" });

//       // Check if user has permission to update this deal
//       if (
//         req.user.role.name !== "Admin" &&
//         deal.assignedTo._id.toString() !== req.user._id.toString()
//       ) {
//         return res.status(403).json({
//           message: "Access denied: You can only update deals assigned to you",
//         });
//       }

//       deal.stage = stage;
//       await deal.save();

//       res.status(200).json(deal);
//     } catch (err) {
//       res.status(500).json({ message: err.message });
//     }
//   },

//   // ------------------ UPDATE DEAL ------------------
//   updateDeal: async (req, res) => {
//     try {
//       const { assignedTo, stage, value, notes, followUpDate } = req.body;
//    console.log("Body:", req.body);
//       const deal = await Deal.findById(req.params.id);
//       if (!deal) return res.status(404).json({ message: "Deal not found" });

//       // Permission check
//       if (
//         req.user.role.name !== "Admin" &&
//         deal.assignedTo?.toString() !== req.user._id.toString()
//       ) {
//         return res.status(403).json({
//           message: "Access denied: You can only update deals assigned to you",
//         });
//       }

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

//       const updateFields = {};
//       if (assignedTo) updateFields.assignedTo = assignedTo;
//       if (stage) updateFields.stage = stage;
//       if (notes !== undefined) updateFields.notes = notes;
//       if (followUpDate !== undefined) updateFields.followUpDate = followUpDate;

//       // ✅ Handle value
//       if (value !== undefined && value !== null) {
//         const numericValue = Number(value.toString().replace(/,/g, ""));
//         if (!isNaN(numericValue)) {
//           const currency = deal.value?.split(" ")[1] || "INR";
//           const formattedValue = `${new Intl.NumberFormat("en-IN").format(
//             numericValue
//           )} ${currency}`;
//           updateFields.value = formattedValue;
//         }
//       }

//       // ✅ Merge attachments
//       let updatedAttachments = [];

//       if (req.body.existingAttachments) {
//         try {
//           updatedAttachments = JSON.parse(req.body.existingAttachments).map(
//             (att) => ({
//               name: att.name || "",
//               path: att.path,
//               type: att.type || "",
//             })
//           );
//         } catch (e) {
//           console.error("Failed to parse existingAttachments:", e);
//         }
//       }

//       if (req.files && req.files.length > 0) {
//         const newFiles = req.files.map((file) => ({
//           name: file.originalname,
//           path: file.path,
//           type: file.mimetype,
//         }));
//         updatedAttachments = [...updatedAttachments, ...newFiles];
//       }

//       if (updatedAttachments.length > 0) {
//         updateFields.attachments = updatedAttachments;
//       }

//       const updatedDeal = await Deal.findByIdAndUpdate(
//         req.params.id,
//         updateFields,
//         { new: true }
//       ).populate("assignedTo", "firstName lastName email");

//       res
//         .status(200)
//         .json({ message: "Deal updated successfully", deal: updatedDeal });
//     } catch (err) {
//       console.error("Update deal error:", err);
//       res.status(500).json({ message: err.message });
//     }
//   },

//   deleteDeal: async (req, res) => {
//     try {
//       const { id } = req.params;

//       // Find the deal first to check permissions
//       const deal = await Deal.findById(id);
//       if (!deal) {
//         return res.status(404).json({ message: "Deal not found" });
//       }

//       // Check if user has permission to delete this deal
//       if (
//         req.user.role.name !== "Admin" &&
//         deal.assignedTo.toString() !== req.user._id.toString()
//       ) {
//         return res.status(403).json({
//           message: "Access denied: You can only delete deals assigned to you",
//         });
//       }

//       await Deal.findByIdAndDelete(id);

//       res.status(200).json({ message: "Deal deleted successfully" });
//     } catch (error) {
//       console.error("Delete deal error:", error);
//       res.status(500).json({ message: "Server error", error: error.message });
//     }
//   },
//   pendingDeals: async (req, res) => {
//     try {
//       let query = {
//         stage: { $nin: ["Closed Won", "Closed Lost"] },
//       };

//       // If user is not admin, only show deals assigned to them
//       if (req.user.role.name !== "Admin") {
//         query.assignedTo = req.user._id;
//       }

//       // Fetch deals which are not yet closed
//       const deals = await Deal.find(query)
//         .populate("assignedTo", "firstName lastName email")
//         .sort({ createdAt: -1 })
//         .limit(10); // limit to recent 10 pending deals

//       res.status(200).json(deals);
//     } catch (error) {
//       console.error("Pending deals error:", error);
//       res.status(500).json({ message: "Server error" });
//     }
//   },
// }; //with sales perimission


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


      res.status(200).json({ message: "Lead converted to deal", deal });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },


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
      "Negotiation",
      "Proposal Sent",
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

    // Store attachments
    const attachments = req.files ? req.files.map((file) => file.path) : [];

    // Save Deal
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
  },//org
  

  
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
    if (req.user.role.name !== "Admin" && deal.assignedTo._id.toString() !== req.user._id.toString()) {
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
    
    // Format response with all required data
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
      industry: deal.industry,
      requirement: deal.requirement,
      address: deal.address,
      country: deal.country,
      followUpDate: deal.followUpDate,
      followUpStatus: deal.followUpStatus,
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
  },//ok

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
      "Negotiation",
      "Proposal Sent",
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
    }

    // Handle attachments
    let finalAttachments = [];

    // Parse existing attachments
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

    // Add new attachments from file upload
    if (req.files && req.files.length > 0) {
      const newAttachments = req.files.map((file) => file.path);
      finalAttachments = [...finalAttachments, ...newAttachments];
    }

    updateFields.attachments = finalAttachments;

    const updatedDeal = await Deal.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true }
    ).populate("assignedTo", "firstName lastName email");

    res.status(200).json({
      message: "Deal updated successfully",
      deal: updatedDeal,
    });
  } catch (err) {
    console.error("Update deal error:", err);
    res.status(500).json({ message: err.message });
  }
},//org



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
