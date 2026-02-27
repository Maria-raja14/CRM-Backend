import Lead from "../models/leads.model.js";
import CallLog from "../models/callLog.model.js";
import { v4 as uuidv4 } from 'uuid';
export const parseCallCommand = async (req, res) => {
  try {
    const { command } = req.body;
    const userId = req.user._id;
    const userRole = req.user.role.name;
    if (!command || !command.toLowerCase().startsWith('call ')) {
      return res.status(400).json({
        success: false,
        message: "Command must start with 'call '"
      });
    }
    const searchTerm = command.substring(5).trim();
    if (!searchTerm) {
      return res.status(400).json({
        success: false,
        message: "Please specify a company or lead name"
      });
    }
    // Build query based on user role
    let leadQuery = {
      $or: [
        { companyName: { $regex: searchTerm, $options: "i" } },
        { leadName: { $regex: searchTerm, $options: "i" } }
      ]
    };
    // ONLY CHANGE: If user is NOT Admin, restrict to their assigned leads
    if (userRole !== "Admin") {
      leadQuery.assignTo = userId;
    }
    const lead = await Lead.findOne(leadQuery).populate('assignTo', 'firstName lastName email');
    if (!lead) {
      // Customize error message based on role
      const errorMessage = userRole === "Admin"
        ? `No lead found for "${searchTerm}"`
        : `No assigned lead found for "${searchTerm}"`;
      return res.status(404).json({
        success: false,
        message: errorMessage
      });
    }
    // Clean phone number
    const phoneNumber = lead.phoneNumber?.replace(/\D/g, "");
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Lead has no phone number"
      });
    }
    // Generate unique session ID for tracking
    const sessionId = uuidv4();
    // Create call log with session ID
    const callLog = new CallLog({
      leadId: lead._id,
      userId,
      callType: "whatsapp",
      phoneNumber,
      callStatus: "initiated",
      initiatedBy: "bot",
      sessionId,
      trackingMethod: "visibility",
      metadata: {
        command,
        searchTerm,
        userRole
      }
    });
    await callLog.save();
    await callLog.populate("leadId", "leadName companyName");
    // Create tracking URLs
    const baseUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    const trackStartUrl = `${baseUrl}/api/calllogs/track/${sessionId}/start`;
    const trackEndUrl = `${baseUrl}/api/calllogs/track/${sessionId}/end`;
    res.json({
      success: true,
      message: `📞 Ready to call ${lead.leadName}`,
      lead: {
        id: lead._id,
        name: lead.leadName,
        company: lead.companyName,
        phone: phoneNumber
      },
      callLog: {
        id: callLog._id,
        sessionId,
        phoneNumber
      },
      whatsappUrl: `https://wa.me/${phoneNumber}`,
      dialerUrl: `tel:${phoneNumber}`,
      tracking: {
        sessionId,
        startUrl: trackStartUrl,
        endUrl: trackEndUrl
      }
    });
  } catch (error) {
    console.error("Bot error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
export const getSuggestions = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role.name;
    // Build query based on user role
    let leadQuery = {};
    // ONLY CHANGE: If user is NOT Admin, only show their assigned leads
    if (userRole !== "Admin") {
      leadQuery.assignTo = userId;
    }
    const recentLeads = await Lead.find(leadQuery)
      .sort({ updatedAt: -1 })
      .limit(5)
      .select("leadName companyName phoneNumber");
    res.json({
      success: true,
      suggestions: recentLeads.map(lead => ({
        command: `call ${lead.companyName || lead.leadName}`,
        label: `${lead.leadName} - ${lead.companyName || "No company"}`,
        phone: lead.phoneNumber
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};