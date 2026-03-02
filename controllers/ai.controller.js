import Deal from "../models/deals.model.js";
import Lead from "../models/leads.model.js";
import User from "../models/user.model.js";

const aiController = async (req, res) => {
  try {
    const payload = req.method === "GET" ? req.query : req.body;
    const { message } = payload;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Message required"
      });
    }
    const userId = req.user._id;
    const roleName = typeof req.user.role === "object"
      ? req.user.role.name
      : req.user.role;
    const lower = message.toLowerCase();
    
    // SECTION 1: DEALS - STAGE-BASED FILTERS FIRST
    // 1A: DEALS WON - MOVED TO TOP
    if (lower.includes("deals won") || lower.includes("won deals") || (lower.includes("won") && lower.includes("deal"))) {
      let query = { stage: "Closed Won" };
      if (roleName !== "Admin") query.assignedTo = userId;
      const deals = await Deal.find(query)
        .populate("assignedTo", "firstName lastName email")
        .sort({ createdAt: -1 });
      return res.json({
        success: true,
        intent: "deals-won",
        message: `You have ${deals.length} won deals.`,
        count: deals.length,
        data: deals.map(deal => formatDeal(deal))
      });
    }
    
    // 1B: DEALS LOST - MOVED TO SECOND
    if (lower.includes("deals lost") || lower.includes("lost deals") || (lower.includes("lost") && lower.includes("deal"))) {
      let query = { stage: "Closed Lost" };
      if (roleName !== "Admin") query.assignedTo = userId;
      const deals = await Deal.find(query)
        .populate("assignedTo", "firstName lastName email")
        .sort({ createdAt: -1 });
      return res.json({
        success: true,
        intent: "deals-lost",
        message: `You have ${deals.length} lost deals.`,
        count: deals.length,
        data: deals.map(deal => formatDeal(deal))
      });
    }
    
    // 1C: OPEN DEALS
    if (lower.includes("open deals") || lower.includes("deals open") || (lower.includes("open") && lower.includes("deal"))) {
      let query = { stage: { $nin: ["Closed Won", "Closed Lost"] } };
      if (roleName !== "Admin") query.assignedTo = userId;
      const deals = await Deal.find(query)
        .populate("assignedTo", "firstName lastName email")
        .sort({ createdAt: -1 });
      return res.json({
        success: true,
        intent: "deals-open",
        message: `You have ${deals.length} open deals.`,
        count: deals.length,
        data: deals.map(deal => formatDeal(deal))
      });
    }
    
    // 1D: MY DEALS
    if (lower.includes("my deals") || lower === "my deals") {
      const deals = await Deal.find({ assignedTo: userId })
        .populate("assignedTo", "firstName lastName email")
        .sort({ createdAt: -1 });
      return res.json({
        success: true,
        intent: "my-deals",
        message: `You have ${deals.length} deal${deals.length !== 1 ? 's' : ''} assigned to you.`,
        count: deals.length,
        data: deals.map(deal => formatDeal(deal))
      });
    }
    
    // 1E: DEALS BY SALESPERSON
    if (lower.includes("deals by") || lower.includes("deals of") || lower.includes("assigned to") || lower.includes("handled by")) {
      let searchName = lower
        .replace(/deals by|deals of|assigned to|handled by|show|get|find|search|for|name/gi, '')
        .trim();
      if (searchName.length > 1) {
        console.log("👤 SEARCHING DEALS BY SALESPERSON:", searchName);
        const nameParts = searchName.split(' ');
        let userQuery = {};
        if (nameParts.length > 1) {
          userQuery = {
            $or: [
              { firstName: { $regex: nameParts[0], $options: 'i' }, lastName: { $regex: nameParts[1], $options: 'i' } },
              { firstName: { $regex: nameParts[1], $options: 'i' }, lastName: { $regex: nameParts[0], $options: 'i' } }
            ]
          };
        } else {
          userQuery = {
            $or: [
              { firstName: { $regex: searchName, $options: 'i' } },
              { lastName: { $regex: searchName, $options: 'i' } }
            ]
          };
        }
        const salespersons = await User.find(userQuery).select('_id firstName lastName email');
        if (salespersons.length > 0) {
          const userIds = salespersons.map(sp => sp._id);
          let dealQuery = {
            assignedTo: { $in: userIds }
          };
          const deals = await Deal.find(dealQuery)
            .populate("assignedTo", "firstName lastName email")
            .sort({ createdAt: -1 });
          const salespersonNames = salespersons.map(sp => `${sp.firstName} ${sp.lastName}`).join(', ');
          return res.json({
            success: true,
            intent: "deals-by-salesperson",
            message: deals.length > 0
              ? `Found ${deals.length} deal${deals.length > 1 ? 's' : ''} handled by ${salespersonNames}`
              : `No deals found for ${salespersonNames}`,
            count: deals.length,
            data: deals.map(deal => formatDeal(deal))
          });
        }
      }
    }
    
    // 1F: SPECIFIC DEAL BY NAME
    if (lower.includes("deal ") && !lower.includes("deals ")) {
      let searchTerm = lower
        .replace(/deal|show|get|find|search|for|about|named|called/gi, '')
        .trim();
      if (searchTerm.length > 1) {
        console.log("🔍 SEARCHING DEAL BY NAME:", searchTerm);
        let query = {
          dealName: { $regex: searchTerm, $options: 'i' }
        };
        if (roleName !== "Admin") {
          query.assignedTo = userId;
        }
        const deals = await Deal.find(query)
          .populate("assignedTo", "firstName lastName email")
          .sort({ createdAt: -1 });
        if (deals.length > 0) {
          return res.json({
            success: true,
            intent: "deal-search",
            message: `Found ${deals.length} deal${deals.length > 1 ? 's' : ''} matching "${searchTerm}"`,
            count: deals.length,
            data: deals.map(deal => formatDeal(deal))
          });
        } else {
          return res.json({
            success: true,
            intent: "deal-search",
            message: `No deals found matching "${searchTerm}"`,
            count: 0,
            data: []
          });
        }
      }
    }
    
    // 1G: DEALS BY COMPANY NAME - MOVED TO LAST
    if (!lower.includes("deals by") && !lower.includes("handled by") &&
      !lower.includes("deal ") && !lower.includes("leads") &&
      !lower.includes("won") && !lower.includes("lost") &&
      !lower.includes("open") && !lower.includes("hot") &&
      !lower.includes("warm") && !lower.includes("cold") &&
      !lower.includes("my")) {  // Added "my" to exclude "my deals"
      
      let searchTerm = message.trim();
      console.log("🏢 SEARCHING DEALS BY COMPANY:", searchTerm);
      const deals = await Deal.find({
        companyName: { $regex: searchTerm, $options: 'i' }
      })
        .populate("assignedTo", "firstName lastName email")
        .sort({ createdAt: -1 });
      if (deals.length > 0) {
        return res.json({
          success: true,
          intent: "deals-by-company",
          message: `Found ${deals.length} deal${deals.length > 1 ? 's' : ''} for company "${searchTerm}"`,
          count: deals.length,
          data: deals.map(deal => formatDeal(deal))
        });
      }
    }
    
    // SECTION 2: LEADS - STAGE-BASED FILTERS FIRST
    // 2A: HOT LEADS
    if (lower.includes("hot leads") || lower.includes("leads hot") || (lower.includes("hot") && lower.includes("lead"))) {
      let query = { status: "Hot" };
      if (roleName !== "Admin") query.assignTo = userId;
      const leads = await Lead.find(query)
        .populate("assignTo", "firstName lastName email")
        .sort({ createdAt: -1 });
      return res.json({
        success: true,
        intent: "leads-hot",
        message: `You have ${leads.length} hot leads.`,
        count: leads.length,
        data: leads.map(lead => formatLead(lead))
      });
    }
    
    // 2B: WARM LEADS
    if (lower.includes("warm leads") || lower.includes("leads warm") || (lower.includes("warm") && lower.includes("lead"))) {
      let query = { status: "Warm" };
      if (roleName !== "Admin") query.assignTo = userId;
      const leads = await Lead.find(query)
        .populate("assignTo", "firstName lastName email")
        .sort({ createdAt: -1 });
      return res.json({
        success: true,
        intent: "leads-warm",
        message: `You have ${leads.length} warm leads.`,
        count: leads.length,
        data: leads.map(lead => formatLead(lead))
      });
    }
    
    // 2C: COLD LEADS
    if (lower.includes("cold leads") || lower.includes("leads cold") || (lower.includes("cold") && lower.includes("lead"))) {
      let query = { status: "Cold" };
      if (roleName !== "Admin") query.assignTo = userId;
      const leads = await Lead.find(query)
        .populate("assignTo", "firstName lastName email")
        .sort({ createdAt: -1 });
      return res.json({
        success: true,
        intent: "leads-cold",
        message: `You have ${leads.length} cold leads.`,
        count: leads.length,
        data: leads.map(lead => formatLead(lead))
      });
    }
    
    // 2D: MY LEADS
    if (lower.includes("my leads") || lower === "my leads") {
      const leads = await Lead.find({ assignTo: userId })
        .populate("assignTo", "firstName lastName email")
        .sort({ createdAt: -1 });
      return res.json({
        success: true,
        intent: "my-leads",
        message: `You have ${leads.length} lead${leads.length !== 1 ? 's' : ''} assigned to you.`,
        count: leads.length,
        data: leads.map(lead => formatLead(lead))
      });
    }
    
    // 2E: LEADS BY SALESPERSON
    if (lower.includes("leads by") || lower.includes("leads of") || lower.includes("assigned to") || lower.includes("handled by")) {
      let searchName = lower
        .replace(/leads by|leads of|assigned to|handled by|show|get|find|search|for|name/gi, '')
        .trim();
      if (searchName.length > 1) {
        console.log("👤 SEARCHING LEADS BY SALESPERSON:", searchName);
        const nameParts = searchName.split(' ');
        let userQuery = {};
        if (nameParts.length > 1) {
          userQuery = {
            $or: [
              { firstName: { $regex: nameParts[0], $options: 'i' }, lastName: { $regex: nameParts[1], $options: 'i' } },
              { firstName: { $regex: nameParts[1], $options: 'i' }, lastName: { $regex: nameParts[0], $options: 'i' } }
            ]
          };
        } else {
          userQuery = {
            $or: [
              { firstName: { $regex: searchName, $options: 'i' } },
              { lastName: { $regex: searchName, $options: 'i' } }
            ]
          };
        }
        const salespersons = await User.find(userQuery).select('_id firstName lastName email');
        if (salespersons.length > 0) {
          const userIds = salespersons.map(sp => sp._id);
          let leadQuery = {
            assignTo: { $in: userIds }
          };
          const leads = await Lead.find(leadQuery)
            .populate("assignTo", "firstName lastName email")
            .sort({ createdAt: -1 });
          const salespersonNames = salespersons.map(sp => `${sp.firstName} ${sp.lastName}`).join(', ');
          return res.json({
            success: true,
            intent: "leads-by-salesperson",
            message: leads.length > 0
              ? `Found ${leads.length} lead${leads.length > 1 ? 's' : ''} handled by ${salespersonNames}`
              : `No leads found for ${salespersonNames}`,
            count: leads.length,
            data: leads.map(lead => formatLead(lead))
          });
        }
      }
    }
    
    // 2F: SPECIFIC LEAD BY NAME
    if (lower.includes("lead ") && !lower.includes("leads ")) {
      let searchTerm = lower
        .replace(/lead|show|get|find|search|for|about|named|called/gi, '')
        .trim();
      if (searchTerm.length > 1) {
        console.log("🔍 SEARCHING LEAD BY NAME:", searchTerm);
        let query = {
          leadName: { $regex: searchTerm, $options: 'i' }
        };
        if (roleName !== "Admin") {
          query.assignTo = userId;
        }
        const leads = await Lead.find(query)
          .populate("assignTo", "firstName lastName email")
          .sort({ createdAt: -1 });
        if (leads.length > 0) {
          return res.json({
            success: true,
            intent: "lead-search",
            message: `Found ${leads.length} lead${leads.length > 1 ? 's' : ''} matching "${searchTerm}"`,
            count: leads.length,
            data: leads.map(lead => formatLead(lead))
          });
        } else {
          return res.json({
            success: true,
            intent: "lead-search",
            message: `No leads found matching "${searchTerm}"`,
            count: 0,
            data: []
          });
        }
      }
    }
    
    // 2G: LEADS BY COMPANY NAME - MOVED TO LAST
    if (!lower.includes("leads by") && !lower.includes("handled by") &&
      !lower.includes("lead ") && !lower.includes("deals") &&
      !lower.includes("won") && !lower.includes("lost") &&
      !lower.includes("open") && !lower.includes("hot") &&
      !lower.includes("warm") && !lower.includes("cold") &&
      !lower.includes("my")) {  // Added "my" to exclude "my leads"
      
      let searchTerm = message.trim();
      console.log("🏢 SEARCHING LEADS BY COMPANY:", searchTerm);
      const leads = await Lead.find({
        companyName: { $regex: searchTerm, $options: 'i' }
      })
        .populate("assignTo", "firstName lastName email")
        .sort({ createdAt: -1 });
      if (leads.length > 0) {
        return res.json({
          success: true,
          intent: "leads-by-company",
          message: `Found ${leads.length} lead${leads.length > 1 ? 's' : ''} for company "${searchTerm}"`,
          count: leads.length,
          data: leads.map(lead => formatLead(lead))
        });
      }
    }
    
    // FALLBACK
    return res.json({
      success: true,
      intent: "unknown",
      message: "Try: 'deals by rosy', 'deal carcare', 'suzi' (company), 'open deals', 'hot leads', 'my deals'",
      data: [],
    });
  } catch (err) {
    console.error("AI ERROR:", err);
    res.status(500).json({
      success: false,
      message: "AI processing failed",
      error: err.message
    });
  }
};

// HELPER FUNCTIONS (keep your existing ones)
function formatDeal(deal) {
  return {
    _id: deal._id,
    dealName: deal.dealName,
    name: deal.dealName,
    stage: deal.stage,
    status: deal.stage,
    value: deal.value && deal.value > 0 ? `$${deal.value.toLocaleString()} ${deal.currency || 'USD'}` : null,
    companyName: deal.companyName,
    company: deal.companyName,
    phoneNumber: deal.phoneNumber,
    phone: deal.phoneNumber,
    handledBy: deal.assignedTo
      ? `${deal.assignedTo.firstName} ${deal.assignedTo.lastName}`
      : "Unassigned",
    assignedTo: deal.assignedTo ? {
      firstName: deal.assignedTo.firstName,
      lastName: deal.assignedTo.lastName,
      email: deal.assignedTo.email
    } : null,
    createdAt: deal.createdAt,
    type: "deal"
  };
}

function formatLead(lead) {
  return {
    _id: lead._id,
    leadName: lead.leadName,
    name: lead.leadName,
    phoneNumber: lead.phoneNumber,
    phone: lead.phoneNumber,
    email: lead.email,
    companyName: lead.companyName,
    company: lead.companyName,
    status: lead.status,
    source: lead.source,
    handledBy: lead.assignTo
      ? `${lead.assignTo.firstName} ${lead.assignTo.lastName}`
      : "Unassigned",
    assignTo: lead.assignTo ? {
      firstName: lead.assignTo.firstName,
      lastName: lead.assignTo.lastName,
      email: lead.assignTo.email
    } : null,
    createdAt: lead.createdAt,
    type: "lead"
  };
}

export default aiController;