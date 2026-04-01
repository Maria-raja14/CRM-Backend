// import Deal from "../models/deals.model.js";
// import Lead from "../models/leads.model.js";
// import sendEmail from "../services/email.js";
// import { notifyUser } from "../realtime/socket.js";

// /* ── Helpers ── */
// const mapFileToAttachment = (file) => ({
//   name:       file.originalname,
//   path:       file.path.replace(/\\/g, "/").replace(/^\/+/, ""),
//   type:       file.mimetype,
//   size:       file.size,
//   uploadedAt: new Date(),
// });

// const normalizeAttachment = (att) => {
//   if (!att) return null;
//   if (typeof att === "string") {
//     const cleanPath = att.replace(/^\/+/, "");
//     return { name: cleanPath.split("/").pop() || "file", path: cleanPath, type: "application/octet-stream", size: 0, uploadedAt: new Date() };
//   }
//   return {
//     _id:        att._id,
//     name:       att.name || att.path?.split("/").pop() || "file",
//     path:       (att.path || "").replace(/^\/+/, ""),
//     type:       att.type || "application/octet-stream",
//     size:       att.size || 0,
//     uploadedAt: att.uploadedAt || new Date(),
//   };
// };

// const formatDealValue = (dealValue, currency = "INR") => {
//   const numeric = Number(String(dealValue).replace(/,/g, ""));
//   if (isNaN(numeric)) return "0";
//   return `${new Intl.NumberFormat("en-IN").format(numeric)} ${currency}`;
// };

// const parseCostField = (v) => {
//   const n = parseFloat(String(v || "0").replace(/,/g, ""));
//   return isNaN(n) ? 0 : n;
// };

// const extractCostFields = (body) => ({
//   purchasingLandCost:   parseCostField(body.purchasingLandCost),
//   purchasingTicketCost: parseCostField(body.purchasingTicketCost),
//   sellingLandCost:      parseCostField(body.sellingLandCost),
//   sellingTicketCost:    parseCostField(body.sellingTicketCost),
// });

// export default {

//   /* ── 1. Convert Lead → Deal ── */
//   createDealFromLead: async (req, res) => {
//     try {
//       const lead = await Lead.findById(req.params.leadId).populate("assignTo");
//       if (!lead) return res.status(404).json({ message: "Lead not found" });
//       if (lead.status === "Converted")
//         return res.status(400).json({ message: "Lead already converted" });

//       lead.status         = "Converted";
//       lead.followUpDate   = null;
//       lead.lastReminderAt = null;
//       await lead.save();

//       const deal = new Deal({
//         leadId:         lead._id,
//         dealName:       lead.leadName,
//         assignedTo:     lead.assignTo?._id,
//         stage:          "Qualification",
//         value:          "0",
//         destination:    lead.destination || "",
//         duration:       lead.duration    || "",
//         noOfTravellers: lead.noOfTravellers || null,
//         travelDate:     lead.travelDate     || null,
//       });
//       await deal.save();

//       res.status(200).json({ message: "Lead converted to deal", deal });
//     } catch (err) {
//       res.status(500).json({ message: err.message });
//     }
//   },

//   /* ── 2. Create Manual Deal ── */
//   createManualDeal: async (req, res) => {
//     try {
//       const {
//         dealName, assignTo, dealValue, currency, stage,
//         notes, phoneNumber, email, source,
//         destination, duration,
//         companyName, industry,
//         requirement, address, country,
//         noOfTravellers, travelDate,
//       } = req.body;

//       const finalDestination = destination || companyName || "";
//       const finalDuration    = duration    || industry    || "";

//       if (!dealName || !phoneNumber || !finalDestination)
//         return res.status(400).json({ message: "dealName, phoneNumber & destination are required" });

//       const allowedStages = ["Qualification","Negotiation","Proposal","Proposal Sent","Closed Won","Closed Lost"];
//       const dealStage     = stage && allowedStages.includes(stage) ? stage : "Qualification";

//       const formattedValue = dealValue && String(dealValue).trim() !== ""
//         ? formatDealValue(dealValue, currency || "INR") : "0";

//       const costFields  = extractCostFields(req.body);
//       const attachments = (req.files || []).map(mapFileToAttachment);

//       const deal = new Deal({
//         dealName,
//         assignedTo:     assignTo        || null,
//         value:          formattedValue,
//         currency:       currency        || "INR",
//         stage:          dealStage,
//         notes:          notes           || "",
//         phoneNumber,
//         email:          email           || "",
//         source:         source          || "",
//         destination:    finalDestination,
//         duration:       finalDuration,
//         requirement:    requirement     || "",
//         address:        address         || "",
//         country:        country         || "",
//         noOfTravellers: noOfTravellers ? parseInt(noOfTravellers, 10) || null : null,
//         travelDate:     travelDate ? new Date(travelDate) : null,
//         attachments,
//         ...costFields,
//       });

//       await deal.save();
//       res.status(201).json({ message: "Manual deal created", deal });
//     } catch (err) {
//       console.error("Error creating manual deal:", err);
//       res.status(500).json({ message: err.message });
//     }
//   },

//   /* ── 3. Get All Deals ── */
//   getAllDeals: async (req, res) => {
//     try {
//       let query = {};
//       if (req.user.role.name !== "Admin") query.assignedTo = req.user._id;

//       const { start, end } = req.query;
//       if (start && end)
//         query.createdAt = { $gte: new Date(start), $lte: new Date(end + "T23:59:59.999Z") };

//       const deals = await Deal.find(query)
//         .populate("assignedTo", "firstName lastName email")
//         .sort({ createdAt: -1 });

//       res.status(200).json(deals);
//     } catch (err) {
//       console.error(err);
//       res.status(500).json({ message: err.message });
//     }
//   },

//   /* ── 4. Get Deal By ID ── */
//   getDealById: async (req, res) => {
//     try {
//       const deal = await Deal.findById(req.params.id)
//         .populate("assignedTo", "firstName lastName email")
//         .populate({ path: "leadId", populate: { path: "assignTo", select: "firstName lastName email" } });

//       if (!deal) return res.status(404).json({ message: "Deal not found" });

//       if (
//         req.user.role.name !== "Admin" &&
//         deal.assignedTo?._id.toString() !== req.user._id.toString()
//       ) {
//         return res.status(403).json({ message: "Access denied: You can only view deals assigned to you" });
//       }

//       const leadAttachments = (deal.leadId?.attachments || []).map(normalizeAttachment).filter(Boolean).map((a) => ({ ...a, source: "lead" }));
//       const dealAttachments = (deal.attachments         || []).map(normalizeAttachment).filter(Boolean).map((a) => ({ ...a, source: "deal" }));

//       const dealData = {
//         _id:            deal._id,
//         dealName:       deal.dealName,
//         dealTitle:      deal.dealTitle,
//         value:          deal.value,
//         currency:       deal.currency,
//         stage:          deal.stage,
//         notes:          deal.notes,
//         phoneNumber:    deal.phoneNumber,
//         email:          deal.email,
//         source:         deal.source,
//         destination:    deal.destination || "",
//         companyName:    deal.destination || "",
//         duration:       deal.duration    || "",
//         industry:       deal.duration    || "",
//         requirement:    deal.requirement,
//         address:        deal.address,
//         country:        deal.country,
//         followUpDate:   deal.followUpDate,
//         followUpStatus: deal.followUpStatus,
//         attachments:    [...leadAttachments, ...dealAttachments],
//         createdAt:      deal.createdAt,
//         updatedAt:      deal.updatedAt,
//         noOfTravellers: deal.noOfTravellers || null,
//         travelDate:     deal.travelDate     || null,
//         purchasingLandCost:   deal.purchasingLandCost   || 0,
//         purchasingTicketCost: deal.purchasingTicketCost || 0,
//         sellingLandCost:      deal.sellingLandCost      || 0,
//         sellingTicketCost:    deal.sellingTicketCost    || 0,
//         totalPurchasingCost:  deal.totalPurchasingCost  || 0,
//         totalSellingCost:     deal.totalSellingCost     || 0,
//         profit:               deal.profit               || 0,
//         assignedTo: deal.assignedTo ? {
//           _id: deal.assignedTo._id, firstName: deal.assignedTo.firstName,
//           lastName: deal.assignedTo.lastName, email: deal.assignedTo.email,
//         } : null,
//         lead: deal.leadId ? {
//           _id: deal.leadId._id, leadName: deal.leadId.leadName,
//           companyName: deal.leadId.companyName, email: deal.leadId.email,
//           status: deal.leadId.status, source: deal.leadId.source,
//           country: deal.leadId.country,
//           assignTo: deal.leadId.assignTo ? {
//             _id: deal.leadId.assignTo._id, firstName: deal.leadId.assignTo.firstName,
//             lastName: deal.leadId.assignTo.lastName, email: deal.leadId.assignTo.email,
//           } : null,
//         } : null,
//       };

//       res.status(200).json(dealData);
//     } catch (err) {
//       console.error("Get deal by ID error:", err);
//       res.status(500).json({ message: err.message });
//     }
//   },

//   /* ── 5. Update Stage ── */
//   updateStage: async (req, res) => {
//     try {
//       const { stage } = req.body;
//       const allowedStages = ["Qualification","Negotiation","Proposal","Proposal Sent","Closed Won","Closed Lost"];
//       if (!allowedStages.includes(stage)) return res.status(400).json({ message: "Invalid stage" });

//       const deal = await Deal.findById(req.params.id).populate("assignedTo", "email");
//       if (!deal) return res.status(404).json({ message: "Deal not found" });

//       if (req.user.role.name !== "Admin" && deal.assignedTo._id.toString() !== req.user._id.toString())
//         return res.status(403).json({ message: "Access denied" });

//       deal.stage = stage;
//       await deal.save();
//       res.status(200).json(deal);
//     } catch (err) {
//       res.status(500).json({ message: err.message });
//     }
//   },

//   /* ── 6. Update Deal ── */
//   updateDeal: async (req, res) => {
//     try {
//       const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

//       const {
//         dealName, dealValue, currency, stage, assignTo,
//         notes, phoneNumber, email, source,
//         destination, duration,
//         companyName, industry,
//         requirement, address, country, existingAttachments,
//         noOfTravellers, travelDate,
//       } = body;

//       const deal = await Deal.findById(req.params.id);
//       if (!deal) return res.status(404).json({ message: "Deal not found" });

//       if (req.user.role.name !== "Admin" && deal.assignedTo?.toString() !== req.user._id.toString())
//         return res.status(403).json({ message: "Access denied" });

//       const allowedStages = ["Qualification","Negotiation","Proposal","Proposal Sent","Closed Won","Closed Lost"];
//       if (stage && !allowedStages.includes(stage))
//         return res.status(400).json({ message: "Invalid stage" });

//       const updateFields = {
//         ...(dealName    && { dealName }),
//         ...(assignTo    && { assignedTo: assignTo }),
//         ...(stage       && { stage }),
//         ...(notes       !== undefined && { notes }),
//         ...(phoneNumber && { phoneNumber }),
//         ...(email       !== undefined && { email }),
//         ...(source      !== undefined && { source }),
//         ...((destination || companyName) && { destination: destination || companyName }),
//         ...((duration    || industry)    && { duration:    duration    || industry }),
//         ...(requirement  !== undefined && { requirement }),
//         ...(address      !== undefined && { address }),
//         ...(country      !== undefined && { country }),
//         ...(noOfTravellers !== undefined && {
//           noOfTravellers: noOfTravellers !== "" && noOfTravellers !== null
//             ? parseInt(noOfTravellers, 10) || null : null,
//         }),
//         ...(travelDate !== undefined && {
//           travelDate: travelDate && travelDate !== "null" && travelDate !== ""
//             ? new Date(travelDate) : null,
//         }),
//         ...extractCostFields(body),
//         updatedAt: new Date(),
//       };

//       if (dealValue !== undefined && dealValue !== null && String(dealValue).trim() !== "") {
//         const finalCurrency     = currency || deal.currency || "INR";
//         updateFields.value      = formatDealValue(dealValue, finalCurrency);
//         updateFields.currency   = finalCurrency;
//       }

//       let keptAttachments = [];
//       if (existingAttachments !== undefined) {
//         try {
//           const parsed    = typeof existingAttachments === "string" ? JSON.parse(existingAttachments) : existingAttachments;
//           keptAttachments = (Array.isArray(parsed) ? parsed : []).map(normalizeAttachment).filter(Boolean);
//         } catch (err) {
//           keptAttachments = (deal.attachments || []).map(normalizeAttachment).filter(Boolean);
//         }
//       } else {
//         keptAttachments = (deal.attachments || []).map(normalizeAttachment).filter(Boolean);
//       }

//       const newAttachments     = (req.files || []).map(mapFileToAttachment);
//       updateFields.attachments = [...keptAttachments, ...newAttachments];

//       const pL = parseCostField(updateFields.purchasingLandCost   ?? deal.purchasingLandCost);
//       const pT = parseCostField(updateFields.purchasingTicketCost ?? deal.purchasingTicketCost);
//       const sL = parseCostField(updateFields.sellingLandCost      ?? deal.sellingLandCost);
//       const sT = parseCostField(updateFields.sellingTicketCost    ?? deal.sellingTicketCost);

//       updateFields.totalPurchasingCost = pL + pT;
//       updateFields.totalSellingCost    = sL + sT;
//       updateFields.profit              = updateFields.totalSellingCost - updateFields.totalPurchasingCost;

//       const updatedDeal = await Deal.findByIdAndUpdate(req.params.id, updateFields, { new: true })
//         .populate("assignedTo", "firstName lastName email");

//       res.status(200).json({ message: "Deal updated successfully", deal: updatedDeal });
//     } catch (err) {
//       console.error("Update deal error:", err);
//       res.status(500).json({ message: err.message });
//     }
//   },

//   /* ── 7. Delete Deal ── */
//   deleteDeal: async (req, res) => {
//     try {
//       const deal = await Deal.findById(req.params.id);
//       if (!deal) return res.status(404).json({ message: "Deal not found" });

//       if (req.user.role.name !== "Admin" && deal.assignedTo.toString() !== req.user._id.toString())
//         return res.status(403).json({ message: "Access denied" });

//       await Deal.findByIdAndDelete(req.params.id);
//       res.status(200).json({ message: "Deal deleted successfully" });
//     } catch (error) {
//       res.status(500).json({ message: "Server error", error: error.message });
//     }
//   },

//   /* ── 8. Bulk Delete Deals ── */
//   bulkDeleteDeals: async (req, res) => {
//     try {
//       const { ids } = req.body;
//       if (!Array.isArray(ids) || ids.length === 0)
//         return res.status(400).json({ message: "No deal IDs provided" });

//       const roleName = req.user.role.name?.toLowerCase();
//       let query = { _id: { $in: ids } };
//       if (roleName === "sales") query.assignedTo = req.user._id;

//       const result = await Deal.deleteMany(query);
//       res.status(200).json({ message: `${result.deletedCount} deal(s) deleted successfully`, deletedCount: result.deletedCount });
//     } catch (error) {
//       res.status(500).json({ message: "Server error", error: error.message });
//     }
//   },

//   /* ── 9. Pending Deals ── */
//   pendingDeals: async (req, res) => {
//     try {
//       let query = { stage: { $nin: ["Closed Won", "Closed Lost"] } };
//       if (req.user.role.name !== "Admin") query.assignedTo = req.user._id;
//       const deals = await Deal.find(query)
//         .populate("assignedTo", "firstName lastName email")
//         .sort({ createdAt: -1 }).limit(10);
//       res.status(200).json(deals);
//     } catch (error) {
//       res.status(500).json({ message: "Server error" });
//     }
//   },
// };//all working correctly..



import Deal from "../models/deals.model.js";
import Lead from "../models/leads.model.js";
import sendEmail from "../services/email.js";
import { notifyUser } from "../realtime/socket.js";

/* ── Helpers ── */
const mapFileToAttachment = (file) => ({
  name:       file.originalname,
  path:       file.path.replace(/\\/g, "/").replace(/^\/+/, ""),
  type:       file.mimetype,
  size:       file.size,
  uploadedAt: new Date(),
});

const normalizeAttachment = (att) => {
  if (!att) return null;
  if (typeof att === "string") {
    const cleanPath = att.replace(/^\/+/, "");
    return { name: cleanPath.split("/").pop() || "file", path: cleanPath, type: "application/octet-stream", size: 0, uploadedAt: new Date() };
  }
  return {
    _id:        att._id,
    name:       att.name || att.path?.split("/").pop() || "file",
    path:       (att.path || "").replace(/^\/+/, ""),
    type:       att.type || "application/octet-stream",
    size:       att.size || 0,
    uploadedAt: att.uploadedAt || new Date(),
  };
};

const formatDealValue = (dealValue, currency = "INR") => {
  const numeric = Number(String(dealValue).replace(/,/g, ""));
  if (isNaN(numeric)) return "0";
  return `${new Intl.NumberFormat("en-IN").format(numeric)} ${currency}`;
};

const parseCostField = (v) => {
  const n = parseFloat(String(v || "0").replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
};

const parseTravellerField = (v) => {
  if (v === undefined || v === "" || v === null) return null;
  const n = parseInt(v, 10);
  return isNaN(n) ? null : n;
};

const extractCostFields = (body) => ({
  purchasingLandCost:   parseCostField(body.purchasingLandCost),
  purchasingTicketCost: parseCostField(body.purchasingTicketCost),
  sellingLandCost:      parseCostField(body.sellingLandCost),
  sellingTicketCost:    parseCostField(body.sellingTicketCost),
});

export default {

  /* ── 1. Convert Lead → Deal ── */
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
        leadId:       lead._id,
        dealName:     lead.leadName,
        assignedTo:   lead.assignTo?._id,
        stage:        "Qualification",
        value:        "0",
        destination:  lead.destination || "",
        duration:     lead.duration    || "",
        noOfAdults:   lead.noOfAdults   || null,
        noOfChildren: lead.noOfChildren || null,
        travelDate:   lead.travelDate   || null,
      });
      await deal.save();

      res.status(200).json({ message: "Lead converted to deal", deal });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  /* ── 2. Create Manual Deal ── */
  createManualDeal: async (req, res) => {
    try {
      const {
        dealName, assignTo, dealValue, currency, stage,
        notes, phoneNumber, email, source,
        destination, duration,
        companyName, industry,
        requirement, address, country,
        noOfAdults, noOfChildren, travelDate,
      } = req.body;

      const finalDestination = destination || companyName || "";
      const finalDuration    = duration    || industry    || "";

      if (!dealName || !phoneNumber || !finalDestination)
        return res.status(400).json({ message: "dealName, phoneNumber & destination are required" });

      const allowedStages = ["Qualification","Negotiation","Proposal","Proposal Sent","Closed Won","Closed Lost"];
      const dealStage     = stage && allowedStages.includes(stage) ? stage : "Qualification";

      const formattedValue = dealValue && String(dealValue).trim() !== ""
        ? formatDealValue(dealValue, currency || "INR") : "0";

      const costFields  = extractCostFields(req.body);
      const attachments = (req.files || []).map(mapFileToAttachment);

      const deal = new Deal({
        dealName,
        assignedTo:   assignTo        || null,
        value:        formattedValue,
        currency:     currency        || "INR",
        stage:        dealStage,
        notes:        notes           || "",
        phoneNumber,
        email:        email           || "",
        source:       source          || "",
        destination:  finalDestination,
        duration:     finalDuration,
        requirement:  requirement     || "",
        address:      address         || "",
        country:      country         || "",
        noOfAdults:   parseTravellerField(noOfAdults),
        noOfChildren: parseTravellerField(noOfChildren),
        travelDate:   travelDate ? new Date(travelDate) : null,
        attachments,
        ...costFields,
      });

      await deal.save();
      res.status(201).json({ message: "Manual deal created", deal });
    } catch (err) {
      console.error("Error creating manual deal:", err);
      res.status(500).json({ message: err.message });
    }
  },

  /* ── 3. Get All Deals ── */
  getAllDeals: async (req, res) => {
    try {
      let query = {};
      if (req.user.role.name !== "Admin") query.assignedTo = req.user._id;

      const { start, end } = req.query;
      if (start && end)
        query.createdAt = { $gte: new Date(start), $lte: new Date(end + "T23:59:59.999Z") };

      const deals = await Deal.find(query)
        .populate("assignedTo", "firstName lastName email")
        .sort({ createdAt: -1 });

      res.status(200).json(deals);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err.message });
    }
  },

  /* ── 4. Get Deal By ID ── */
  getDealById: async (req, res) => {
    try {
      const deal = await Deal.findById(req.params.id)
        .populate("assignedTo", "firstName lastName email")
        .populate({ path: "leadId", populate: { path: "assignTo", select: "firstName lastName email" } });

      if (!deal) return res.status(404).json({ message: "Deal not found" });

      if (
        req.user.role.name !== "Admin" &&
        deal.assignedTo?._id.toString() !== req.user._id.toString()
      ) {
        return res.status(403).json({ message: "Access denied: You can only view deals assigned to you" });
      }

      const leadAttachments = (deal.leadId?.attachments || []).map(normalizeAttachment).filter(Boolean).map((a) => ({ ...a, source: "lead" }));
      const dealAttachments = (deal.attachments         || []).map(normalizeAttachment).filter(Boolean).map((a) => ({ ...a, source: "deal" }));

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
        destination:    deal.destination || "",
        companyName:    deal.destination || "",
        duration:       deal.duration    || "",
        industry:       deal.duration    || "",
        requirement:    deal.requirement,
        address:        deal.address,
        country:        deal.country,
        followUpDate:   deal.followUpDate,
        followUpStatus: deal.followUpStatus,
        attachments:    [...leadAttachments, ...dealAttachments],
        createdAt:      deal.createdAt,
        updatedAt:      deal.updatedAt,
        noOfAdults:     deal.noOfAdults   || null,
        noOfChildren:   deal.noOfChildren || null,
        travelDate:     deal.travelDate   || null,
        purchasingLandCost:   deal.purchasingLandCost   || 0,
        purchasingTicketCost: deal.purchasingTicketCost || 0,
        sellingLandCost:      deal.sellingLandCost      || 0,
        sellingTicketCost:    deal.sellingTicketCost    || 0,
        totalPurchasingCost:  deal.totalPurchasingCost  || 0,
        totalSellingCost:     deal.totalSellingCost     || 0,
        profit:               deal.profit               || 0,
        assignedTo: deal.assignedTo ? {
          _id: deal.assignedTo._id, firstName: deal.assignedTo.firstName,
          lastName: deal.assignedTo.lastName, email: deal.assignedTo.email,
        } : null,
        lead: deal.leadId ? {
          _id: deal.leadId._id, leadName: deal.leadId.leadName,
          companyName: deal.leadId.companyName, email: deal.leadId.email,
          status: deal.leadId.status, source: deal.leadId.source,
          country: deal.leadId.country,
          assignTo: deal.leadId.assignTo ? {
            _id: deal.leadId.assignTo._id, firstName: deal.leadId.assignTo.firstName,
            lastName: deal.leadId.assignTo.lastName, email: deal.leadId.assignTo.email,
          } : null,
        } : null,
      };

      res.status(200).json(dealData);
    } catch (err) {
      console.error("Get deal by ID error:", err);
      res.status(500).json({ message: err.message });
    }
  },

  /* ── 5. Update Stage ── */
  updateStage: async (req, res) => {
    try {
      const { stage } = req.body;
      const allowedStages = ["Qualification","Negotiation","Proposal","Proposal Sent","Closed Won","Closed Lost"];
      if (!allowedStages.includes(stage)) return res.status(400).json({ message: "Invalid stage" });

      const deal = await Deal.findById(req.params.id).populate("assignedTo", "email");
      if (!deal) return res.status(404).json({ message: "Deal not found" });

      if (req.user.role.name !== "Admin" && deal.assignedTo._id.toString() !== req.user._id.toString())
        return res.status(403).json({ message: "Access denied" });

      deal.stage = stage;
      await deal.save();
      res.status(200).json(deal);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  /* ── 6. Update Deal ── */
  updateDeal: async (req, res) => {
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

      const {
        dealName, dealValue, currency, stage, assignTo,
        notes, phoneNumber, email, source,
        destination, duration,
        companyName, industry,
        requirement, address, country, existingAttachments,
        noOfAdults, noOfChildren, travelDate,
      } = body;

      const deal = await Deal.findById(req.params.id);
      if (!deal) return res.status(404).json({ message: "Deal not found" });

      if (req.user.role.name !== "Admin" && deal.assignedTo?.toString() !== req.user._id.toString())
        return res.status(403).json({ message: "Access denied" });

      const allowedStages = ["Qualification","Negotiation","Proposal","Proposal Sent","Closed Won","Closed Lost"];
      if (stage && !allowedStages.includes(stage))
        return res.status(400).json({ message: "Invalid stage" });

      const updateFields = {
        ...(dealName    && { dealName }),
        ...(assignTo    && { assignedTo: assignTo }),
        ...(stage       && { stage }),
        ...(notes       !== undefined && { notes }),
        ...(phoneNumber && { phoneNumber }),
        ...(email       !== undefined && { email }),
        ...(source      !== undefined && { source }),
        ...((destination || companyName) && { destination: destination || companyName }),
        ...((duration    || industry)    && { duration:    duration    || industry }),
        ...(requirement  !== undefined && { requirement }),
        ...(address      !== undefined && { address }),
        ...(country      !== undefined && { country }),
        // ── UPDATED: noOfAdults + noOfChildren ──
        ...(noOfAdults !== undefined && {
          noOfAdults: parseTravellerField(noOfAdults),
        }),
        ...(noOfChildren !== undefined && {
          noOfChildren: parseTravellerField(noOfChildren),
        }),
        ...(travelDate !== undefined && {
          travelDate: travelDate && travelDate !== "null" && travelDate !== ""
            ? new Date(travelDate) : null,
        }),
        ...extractCostFields(body),
        updatedAt: new Date(),
      };

      if (dealValue !== undefined && dealValue !== null && String(dealValue).trim() !== "") {
        const finalCurrency     = currency || deal.currency || "INR";
        updateFields.value      = formatDealValue(dealValue, finalCurrency);
        updateFields.currency   = finalCurrency;
      }

      let keptAttachments = [];
      if (existingAttachments !== undefined) {
        try {
          const parsed    = typeof existingAttachments === "string" ? JSON.parse(existingAttachments) : existingAttachments;
          keptAttachments = (Array.isArray(parsed) ? parsed : []).map(normalizeAttachment).filter(Boolean);
        } catch (err) {
          keptAttachments = (deal.attachments || []).map(normalizeAttachment).filter(Boolean);
        }
      } else {
        keptAttachments = (deal.attachments || []).map(normalizeAttachment).filter(Boolean);
      }

      const newAttachments     = (req.files || []).map(mapFileToAttachment);
      updateFields.attachments = [...keptAttachments, ...newAttachments];

      const pL = parseCostField(updateFields.purchasingLandCost   ?? deal.purchasingLandCost);
      const pT = parseCostField(updateFields.purchasingTicketCost ?? deal.purchasingTicketCost);
      const sL = parseCostField(updateFields.sellingLandCost      ?? deal.sellingLandCost);
      const sT = parseCostField(updateFields.sellingTicketCost    ?? deal.sellingTicketCost);

      updateFields.totalPurchasingCost = pL + pT;
      updateFields.totalSellingCost    = sL + sT;
      updateFields.profit              = updateFields.totalSellingCost - updateFields.totalPurchasingCost;

      const updatedDeal = await Deal.findByIdAndUpdate(req.params.id, updateFields, { new: true })
        .populate("assignedTo", "firstName lastName email");

      res.status(200).json({ message: "Deal updated successfully", deal: updatedDeal });
    } catch (err) {
      console.error("Update deal error:", err);
      res.status(500).json({ message: err.message });
    }
  },

  /* ── 7. Delete Deal ── */
  deleteDeal: async (req, res) => {
    try {
      const deal = await Deal.findById(req.params.id);
      if (!deal) return res.status(404).json({ message: "Deal not found" });

      if (req.user.role.name !== "Admin" && deal.assignedTo.toString() !== req.user._id.toString())
        return res.status(403).json({ message: "Access denied" });

      await Deal.findByIdAndDelete(req.params.id);
      res.status(200).json({ message: "Deal deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  /* ── 8. Bulk Delete Deals ── */
  bulkDeleteDeals: async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0)
        return res.status(400).json({ message: "No deal IDs provided" });

      const roleName = req.user.role.name?.toLowerCase();
      let query = { _id: { $in: ids } };
      if (roleName === "sales") query.assignedTo = req.user._id;

      const result = await Deal.deleteMany(query);
      res.status(200).json({ message: `${result.deletedCount} deal(s) deleted successfully`, deletedCount: result.deletedCount });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  /* ── 9. Pending Deals ── */
  pendingDeals: async (req, res) => {
    try {
      let query = { stage: { $nin: ["Closed Won", "Closed Lost"] } };
      if (req.user.role.name !== "Admin") query.assignedTo = req.user._id;
      const deals = await Deal.find(query)
        .populate("assignedTo", "firstName lastName email")
        .sort({ createdAt: -1 }).limit(10);
      res.status(200).json(deals);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  },
};