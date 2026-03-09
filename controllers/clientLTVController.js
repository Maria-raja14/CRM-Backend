import ClientLTV from "../models/ClientLTV.js";
import Deal from "../models/deals.model.js";
import SupportTicket from "../models/SupportTicket.js";
import Renewal from "../models/Renewal.js";
import ClientReview from "../models/ClientReview.js";
import PricingRisk from "../models/PricingRisk.js";

// ---------- Helper functions ----------

async function getSupportMetrics(companyId) {
  const tickets = await SupportTicket.find({ companyId }).sort({ openedAt: -1 }).lean();
  const total = tickets.length;
  const open = tickets.filter(t => t.status === "Open").length;
  const lastSupportDate = total > 0 ? tickets[0].openedAt : null;

  // Calculate support points (100 - (tickets * 5), min 0)
  const supportPoints = Math.max(0, 100 - (total * 5));

  let avgResolutionHours = 0;
  const closed = tickets.filter(t => t.status === "Closed" && t.resolutionTimeHours);
  if (closed.length > 0) {
    avgResolutionHours = closed.reduce((sum, t) => sum + (t.resolutionTimeHours || 0), 0) / closed.length;
  }

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const recent = tickets.filter(t => new Date(t.openedAt) >= sixMonthsAgo);
  const perMonth = recent.length / 6;

  return { total, open, lastSupportDate, avgResolutionHours, perMonth, supportPoints };
}

// CRITICAL FIX: Get follow-up metrics directly from deal
// CRITICAL FIX: Get follow-up metrics directly from deal using action dates
async function getFollowUpMetrics(dealId) {
  const deal = await Deal.findById(dealId).lean();
  
  if (!deal) return { count: 0, lastDate: null, daysSince: 365 };
  
  // Get count from followUpHistory
  const followUpCount = deal.followUpHistory?.length || 0;
  
  // Get the most recent follow-up action date from history
  let lastFollowUpDate = null;
  
  if (deal.followUpHistory && deal.followUpHistory.length > 0) {
    // Sort history by action date (most recent first)
    const sortedHistory = [...deal.followUpHistory].sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    });
    
    // Use the action date (when follow-up was done) not the scheduled date
    lastFollowUpDate = sortedHistory[0]?.date || null;
    
    console.log(`📅 Deal ${dealId} - Most recent follow-up action:`, {
      actionDate: lastFollowUpDate,
      scheduledDate: sortedHistory[0]?.followUpDate,
      action: sortedHistory[0]?.action
    });
  } else if (deal.followUpDate) {
    // If no history but there's a current follow-up date
    lastFollowUpDate = deal.followUpDate;
    console.log(`📅 Deal ${dealId} - Using current follow-up date:`, lastFollowUpDate);
  }
  
  // Calculate days since last follow-up
  const daysSince = calculateDaysSinceFollowUp(lastFollowUpDate);
  
  console.log(`📊 Deal ${dealId} - Follow-up metrics:`, {
    historyCount: deal.followUpHistory?.length,
    calculatedCount: followUpCount,
    lastDate: lastFollowUpDate,
    daysSince: daysSince
  });
  
  return { 
    count: followUpCount, 
    lastDate: lastFollowUpDate,
    daysSince 
  };
}

// Calculate days since follow-up
const calculateDaysSinceFollowUp = (lastFollowUpDate) => {
  if (!lastFollowUpDate) return 365; // Default if no follow-up
  
  const lastDate = new Date(lastFollowUpDate);
  const now = new Date();
  
  // Set both to start of day for accurate day calculation
  lastDate.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  
  const diffTime = now - lastDate;
  const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, days);
};

/**
 * 🚀 CLASSIFICATION LOGIC
 */
const classifyDeal = ({
  totalRevenue = 0,
  supportTickets = 0,
  clientHealthScore = 50,
  daysSinceFollowUp = 0,
  progress = "average",
}) => {

  // Force Safe Number Conversion
  totalRevenue = Number(totalRevenue);
  supportTickets = Number(supportTickets);
  clientHealthScore = Number(clientHealthScore);
  daysSinceFollowUp = Number(daysSinceFollowUp);

  if (isNaN(totalRevenue)) totalRevenue = 0;
  if (isNaN(supportTickets)) supportTickets = 0;
  if (isNaN(clientHealthScore)) clientHealthScore = 50;
  if (isNaN(daysSinceFollowUp)) daysSinceFollowUp = 0;

  // Clamp values
  clientHealthScore = Math.min(100, Math.max(0, clientHealthScore));
  daysSinceFollowUp = Math.max(0, daysSinceFollowUp);

  // Normalize Progress
  const normalizedProgress = String(progress).trim().toLowerCase();

  // DORMANT
  if (daysSinceFollowUp > 90) {
    return "Dormant";
  }

  // UPSELL
  const isUpsell =
    normalizedProgress === "excellent" &&
    totalRevenue >= 500000 &&
    clientHealthScore >= 80 &&
    supportTickets <= 2 &&
    daysSinceFollowUp <= 30;

  if (isUpsell) {
    return "Upsell";
  }

  // AT RISK
  const isAtRisk =
    normalizedProgress === "poor" ||
    clientHealthScore < 70 ||
    supportTickets >= 5 ||
    daysSinceFollowUp > 30;

  if (isAtRisk) {
    return "At Risk";
  }

  // TOP VALUE
  return "Top Value";
};

// Value category based on deal amount
const getValueCategory = (amount) => {
  if (amount > 500000) return "High Value";
  if (amount >= 100000 && amount <= 500000) return "Medium Value";
  return "Low Value";
};

/**
 * PRICING CALCULATION
 */
const calculatePricingRecommendation = (metrics) => {
  const { progress, supportTickets, clientHealthScore, totalRevenue, delivered } = metrics;
  
  // Progress-based discount
  let progressDiscount = 0;
  switch(progress) {
    case "Excellent": progressDiscount = 30; break;
    case "Good": progressDiscount = 30; break;
    case "Average": progressDiscount = 20; break;
    case "Poor": progressDiscount = 0; break;
    default: progressDiscount = 20;
  }
  
  // Support ticket override
  let supportDiscount = 30;
  if (supportTickets > 10) supportDiscount = 0;
  else if (supportTickets > 5) supportDiscount = 20;
  else if (supportTickets > 2) supportDiscount = 30;
  else supportDiscount = 30;
  
  // Health score discount
  let healthDiscount = 0;
  if (clientHealthScore > 75) healthDiscount = 30;
  else if (clientHealthScore > 50) healthDiscount = 20;
  else healthDiscount = 0;
  
  // Delivery bonus
  const deliveryBonus = delivered ? 15 : 0;
  
  // Calculate final discount
  const discounts = [progressDiscount, supportDiscount, healthDiscount, deliveryBonus];
  const averageDiscount = discounts.reduce((a, b) => a + b, 0) / discounts.length;
  const finalDiscount = Math.min(Math.round(averageDiscount), 50);
  
  // Suggested price range
  const minPrice = Math.round(totalRevenue * (1 - finalDiscount / 100));
  const maxPrice = Math.round(totalRevenue * 1.1);
  
  // Confidence score
  let confidenceScore = 70;
  if (supportTickets < 3 && progress === "Excellent") confidenceScore = 90;
  else if (supportTickets > 10 || progress === "Poor") confidenceScore = 50;
  
  return {
    suggestedMinPrice: minPrice,
    suggestedMaxPrice: maxPrice,
    recommendedDiscount: finalDiscount,
    confidenceScore,
    deliveryBonus
  };
};

/**
 * Clean up invalid clients
 */
const cleanupInvalidClients = async () => {
  try {
    const activeWonDealIds = await Deal.find({ stage: "Closed Won" }).distinct("_id");
    const result = await ClientLTV.deleteMany({
      companyId: { $nin: activeWonDealIds }
    });
    
    if (result.deletedCount > 0) {
      console.log(`🧹 Cleaned up ${result.deletedCount} invalid clients from CLV collection`);
    }
    
    return result.deletedCount;
  } catch (error) {
    console.error("Error cleaning up invalid clients:", error);
    return 0;
  }
};

/**
 * CRITICAL: Recalculate metrics from deal data
 */
const recalculateMetricsFromDeal = async (companyId, companyName) => {
  try {
    console.log(`🔄 Recalculating metrics for ${companyName} from deal data...`);

    // Get the deal
    const deal = await Deal.findById(companyId).lean();
    if (!deal) {
      console.error(`Deal not found for companyId: ${companyId}`);
      return null;
    }

    // Only process Closed Won deals
    if (deal.stage !== "Closed Won") {
      console.log(`⚠️ Deal ${companyName} is not Closed Won - removing from CLV`);
      await ClientLTV.findOneAndDelete({ companyId });
      return null;
    }

    // Get the latest review
    const latestReview = await ClientReview.findOne({ companyId }).sort({ reviewedAt: -1 }).lean();

    // Parse numeric value
    const numericMatch = deal.value?.toString().match(/\d+/g);
    const totalRevenue = numericMatch ? parseInt(numericMatch.join('')) : 0;

    // Get support metrics
    const supportMetrics = await getSupportMetrics(companyId);
    const supportTickets = supportMetrics.total;

    // CRITICAL: Get follow-up metrics directly from deal
    const followUpMetrics = await getFollowUpMetrics(companyId);
    const followUpCount = followUpMetrics.count;
    const lastFollowUpDate = followUpMetrics.lastDate;
    const daysSinceFollowUp = followUpMetrics.daysSince;

    console.log(`📊 CRITICAL - Follow-up for ${companyName}:`, {
      dealId: companyId,
      followUpCount,
      lastFollowUpDate,
      daysSinceFollowUp,
      historyLength: deal.followUpHistory?.length
    });

    // Use review data if available
    const progress = latestReview?.progress || "Average";
    const clientHealthScore = latestReview?.clientHealthScore || 50;
    const delivered = latestReview?.delivered || false;

    // Prepare metrics for classification
    const metrics = {
      totalRevenue,
      supportTickets,
      clientHealthScore,
      daysSinceFollowUp,
      progress
    };

    // Get classification
    const classification = classifyDeal(metrics);
    
    // Generate reason
    let reason = "";
    switch(classification) {
      case "Upsell":
        reason = `Upsell: ${supportTickets} tickets, revenue > ₹500k, health ${clientHealthScore}`;
        break;
      case "Top Value":
        reason = `Top value: revenue > ₹500k, ${supportTickets} tickets, health ${clientHealthScore}, recent follow-up`;
        break;
      case "Dormant":
        reason = `Dormant: ${supportTickets} tickets, value < ₹500k, no follow-up for ${daysSinceFollowUp} days`;
        break;
      case "At Risk":
        reason = `At risk: Does not meet Upsell, Top Value, or Dormant criteria`;
        break;
    }
    
    // Calculate value category
    const valueCategory = getValueCategory(totalRevenue);
    
    // Get risk factors
    const riskFactors = [];
    if (daysSinceFollowUp > 60) riskFactors.push(`No follow-up for ${daysSinceFollowUp} days`);
    if (supportTickets > 10) riskFactors.push(`${supportTickets} support tickets`);
    if (clientHealthScore < 50) riskFactors.push(`Low health score: ${clientHealthScore}`);
    
    // Calculate pricing recommendation
    const pricing = calculatePricingRecommendation({
      progress,
      supportTickets,
      clientHealthScore,
      totalRevenue,
      delivered
    });

    // Update or create ClientLTV
    let clientLTV = await ClientLTV.findOne({ companyId });

    if (!clientLTV) {
      clientLTV = new ClientLTV({
        companyId,
        companyName
      });
    }

    // CRITICAL: Update all fields with special attention to follow-up metrics
    clientLTV.totalRevenue = totalRevenue;
    clientLTV.totalDeals = 1;
    clientLTV.lastFollowUpDate = lastFollowUpDate;
    clientLTV.daysSinceFollowUp = daysSinceFollowUp; // This MUST update
    clientLTV.totalSupportTickets = supportTickets;
    clientLTV.supportPoints = supportMetrics.supportPoints;
    clientLTV.followUpCount = followUpCount;
    clientLTV.openSupportTickets = supportMetrics.open;
    clientLTV.lastSupportDate = supportMetrics.lastSupportDate;
    clientLTV.riskFactors = riskFactors;
    clientLTV.classification = classification;
    clientLTV.classificationReason = reason;
    clientLTV.valueCategory = valueCategory;
    clientLTV.customerLifetimeValue = totalRevenue;
    clientLTV.clientHealthScore = clientHealthScore;
    clientLTV.delivered = delivered;
    clientLTV.progress = progress;
    if (latestReview) {
      clientLTV.latestReview = latestReview._id;
    }
    clientLTV.suggestedMinPrice = pricing.suggestedMinPrice;
    clientLTV.suggestedMaxPrice = pricing.suggestedMaxPrice;
    clientLTV.recommendedDiscount = pricing.recommendedDiscount;
    clientLTV.lastClassificationUpdate = new Date();

    await clientLTV.save();
    
    console.log(`✅ CRITICAL - Updated ${companyName}:`, {
      oldDaysSince: clientLTV.daysSinceFollowUp,
      newDaysSince: daysSinceFollowUp,
      followUpCount,
      lastFollowUpDate,
      classification
    });

    return clientLTV;
  } catch (error) {
    console.error("Error in recalculateMetricsFromDeal:", error);
    throw error;
  }
};

// Core function to calculate metrics from review data
const calculateMetricsFromReview = async (companyId, companyName, reviewData) => {
  try {
    console.log(`Calculating metrics for ${companyName} from review...`);

    // Get the deal
    const deal = await Deal.findById(companyId).lean();
    if (!deal) {
      console.error(`Deal not found for companyId: ${companyId}`);
      return null;
    }

    // Parse numeric value
    const numericMatch = deal.value?.toString().match(/\d+/g);
    const totalRevenue = numericMatch ? parseInt(numericMatch.join('')) : 0;

    // Use supportTickets from reviewData (manual override)
    const supportTickets = reviewData.supportTickets !== undefined 
      ? reviewData.supportTickets 
      : 0;
    
    // Get support metrics
    const supportMetrics = await getSupportMetrics(companyId);
    
    // CRITICAL: Get follow-up metrics from deal
    const followUpMetrics = await getFollowUpMetrics(companyId);
    const followUpCount = followUpMetrics.count;
    const lastFollowUpDate = followUpMetrics.lastDate;
    const daysSinceFollowUp = followUpMetrics.daysSince;

    console.log(`📊 Review - Follow-up for ${companyName}:`, {
      count: followUpCount,
      lastDate: lastFollowUpDate,
      daysSince: daysSinceFollowUp
    });

    // Prepare metrics for classification
    const metrics = {
      totalRevenue,
      supportTickets,
      clientHealthScore: reviewData.clientHealthScore || 50,
      daysSinceFollowUp,
      progress: reviewData.progress
    };

    // Get classification
    const classification = classifyDeal(metrics);
    
    // Generate reason
    let reason = "";
    switch(classification) {
      case "Upsell":
        reason = `Upsell: ${supportTickets} tickets, revenue > ₹500k, health ${reviewData.clientHealthScore}`;
        break;
      case "Top Value":
        reason = `Top value: revenue > ₹500k, ${supportTickets} tickets, health ${reviewData.clientHealthScore}, recent follow-up`;
        break;
      case "Dormant":
        reason = `Dormant: ${supportTickets} tickets, value < ₹500k, no follow-up for ${daysSinceFollowUp} days`;
        break;
      case "At Risk":
        reason = `At risk: Does not meet Upsell, Top Value, or Dormant criteria`;
        break;
    }
    
    // Calculate value category
    const valueCategory = getValueCategory(totalRevenue);
    
    // Get risk factors
    const riskFactors = [];
    if (daysSinceFollowUp > 60) riskFactors.push(`No follow-up for ${daysSinceFollowUp} days`);
    if (supportTickets > 10) riskFactors.push(`${supportTickets} support tickets`);
    if (reviewData.clientHealthScore < 50) riskFactors.push(`Low health score: ${reviewData.clientHealthScore}`);
    
    // Calculate pricing recommendation
    const pricing = calculatePricingRecommendation({
      progress: reviewData.progress,
      supportTickets,
      clientHealthScore: reviewData.clientHealthScore,
      totalRevenue,
      delivered: reviewData.delivered
    });

    // Update or create ClientLTV
    let clientLTV = await ClientLTV.findOne({ companyId });

    if (!clientLTV) {
      clientLTV = new ClientLTV({
        companyId,
        companyName
      });
    }

    // Update all fields
    clientLTV.totalRevenue = totalRevenue;
    clientLTV.totalDeals = 1;
    clientLTV.lastFollowUpDate = lastFollowUpDate;
    clientLTV.daysSinceFollowUp = daysSinceFollowUp;
    clientLTV.totalSupportTickets = supportTickets;
    clientLTV.supportPoints = supportMetrics.supportPoints;
    clientLTV.followUpCount = followUpCount;
    clientLTV.openSupportTickets = supportMetrics.open;
    clientLTV.lastSupportDate = supportMetrics.lastSupportDate;
    clientLTV.riskFactors = riskFactors;
    clientLTV.classification = classification;
    clientLTV.classificationReason = reason;
    clientLTV.valueCategory = valueCategory;
    clientLTV.customerLifetimeValue = totalRevenue;
    clientLTV.clientHealthScore = reviewData.clientHealthScore;
    clientLTV.delivered = reviewData.delivered === true ? true : false;
    clientLTV.progress = reviewData.progress;
    clientLTV.latestReview = reviewData._id;
    clientLTV.suggestedMinPrice = pricing.suggestedMinPrice;
    clientLTV.suggestedMaxPrice = pricing.suggestedMaxPrice;
    clientLTV.recommendedDiscount = pricing.recommendedDiscount;
    clientLTV.lastClassificationUpdate = new Date();

    await clientLTV.save();
    console.log(`✅ Review - Updated ${companyName}:`, {
      daysSinceFollowUp,
      followUpCount,
      classification
    });

    return clientLTV;
  } catch (error) {
    console.error("Error in calculateMetricsFromReview:", error);
    throw error;
  }
};

// ---------- CONTROLLER METHODS ----------

export default {
  calculateClientCLV: async (req, res) => {
    try {
      const { companyName } = req.params;
      const decodedName = decodeURIComponent(companyName);

      console.log("🔵 API: calculateClientCLV called for:", decodedName);

      const deal = await Deal.findOne({ companyName: decodedName }).lean();

      if (!deal) {
        return res.status(404).json({
          success: false,
          message: "No deal found for this company"
        });
      }

      if (deal.stage !== "Closed Won") {
        console.log(`⚠️ Deal for ${decodedName} is not Closed Won - removing from CLV`);
        await ClientLTV.findOneAndDelete({ companyId: deal._id });
        return res.json({
          success: true,
          message: "Deal is not Closed Won - removed from CLV",
          data: null
        });
      }

      const latestReview = await ClientReview.findOne({ companyId: deal._id })
        .sort({ reviewedAt: -1 })
        .lean();

      if (!latestReview) {
        return res.status(404).json({
          success: false,
          message: "No review found for this client"
        });
      }

      const result = await calculateMetricsFromReview(
        deal._id,
        decodedName,
        latestReview
      );

      res.json({
        success: true,
        data: result,
        message: "CLV calculated successfully"
      });

    } catch (error) {
      console.error("❌ Error in calculateClientCLV controller:", error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  getWonDeals: async (req, res) => {
  try {
    const { page = 1, limit = 5, classification = "all" } = req.query;
    const skip = (page - 1) * limit;

    let filterQuery = { stage: "Closed Won" };
    
    const deals = await Deal.find(filterQuery)
      .populate("assignedTo", "firstName lastName")
      .sort({ wonAt: -1, createdAt: -1 })
      .lean();

    if (!deals || deals.length === 0) {
      return res.json({ 
        success: true, 
        data: [],
        pagination: { total: 0, page: 1, pages: 1 }
      });
    }

    // Get CLV data
    const clvData = await ClientLTV.find().lean();
    const clvMap = {};
    clvData.forEach(c => {
      if (c.companyId) {
        clvMap[c.companyId.toString()] = c;
      }
    });

    // Get reviews for status
    const reviews = await ClientReview.find().lean();
    const reviewMap = {};
    reviews.forEach(r => {
      if (r.companyId) reviewMap[r.companyId.toString()] = r;
    });

    // Format deals using CLV data with DYNAMIC days calculation
    let formattedDeals = deals.map(deal => {
      const dealId = deal._id.toString();
      const clvEntry = clvMap[dealId];
      const reviewEntry = reviewMap[dealId];
      
      // DYNAMIC CALCULATION: Calculate days since follow-up right now
      let dynamicDaysSinceFollowUp = 365; // Default
      
      if (clvEntry?.lastFollowUpDate) {
        const lastDate = new Date(clvEntry.lastFollowUpDate);
        const now = new Date();
        
        // Set both to start of day for accurate calculation
        lastDate.setHours(0, 0, 0, 0);
        now.setHours(0, 0, 0, 0);
        
        const diffTime = now - lastDate;
        dynamicDaysSinceFollowUp = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
      }
      
      return {
        _id: deal._id,
        clientName: deal.dealName || "Unnamed",
        companyName: deal.companyName || "Unknown",
        companyId: deal._id,
        dealId: deal._id,
        dealValue: deal.value || "0",
        delivered: clvEntry?.delivered === true ? true : false,
        assignedTo: deal.assignedTo 
          ? `${deal.assignedTo.firstName || ''} ${deal.assignedTo.lastName || ''}`.trim()
          : "Unassigned",
        salespersonId: deal.assignedTo?._id,
        supportTicketCount: clvEntry?.totalSupportTickets || 0,
        // USE DYNAMIC VALUE instead of stored value
        daysSinceFollowUp: dynamicDaysSinceFollowUp,
        reviewProgress: clvEntry?.progress || null,
        classification: clvEntry?.classification || "At Risk",
        clientHealthScore: clvEntry?.clientHealthScore || 50,
        reviewStatus: reviewEntry ? "Submitted" : "Pending",
        hasReview: !!reviewEntry
      };
    });

    if (classification !== "all") {
      formattedDeals = formattedDeals.filter(deal => 
        deal.classification === classification
      );
    }

    const paginatedDeals = formattedDeals.slice(skip, skip + parseInt(limit));
    const filteredTotal = formattedDeals.length;
    const pages = Math.ceil(filteredTotal / parseInt(limit));

    res.json({ 
      success: true, 
      data: paginatedDeals,
      pagination: {
        total: filteredTotal,
        page: parseInt(page),
        pages: pages
      }
    });
  } catch (error) {
    console.error("Error in getWonDeals:", error);
    res.status(500).json({ success: false, message: error.message });
  }
},

  createClientReview: async (req, res) => {
    try {
      console.log("=".repeat(50));
      console.log("🔵 RECEIVED REVIEW REQUEST:");
      console.log("Body:", JSON.stringify(req.body, null, 2));
      
      const {
        companyId,
        companyName,
        clientName,
        dealId,
        dealValue,
        delivered,
        salespersonId,
        salespersonName,
        supportTickets,
        progress,
        reviewNotes,
        clientHealthScore
      } = req.body;

      if (!companyId || !companyName || !clientName || !dealId) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields"
        });
      }

      const userId = req.user?._id || req.user?.id;

      // Create review data
      const reviewData = {
        companyId,
        companyName,
        clientName,
        dealId,
        dealValue: parseFloat(dealValue?.toString().replace(/[^0-9.-]+/g, '')) || 0,
        delivered: delivered === true ? true : false,
        salespersonId,
        salespersonName,
        supportTickets: parseInt(supportTickets) || 0,
        progress: progress || "Average",
        reviewNotes: reviewNotes || "",
        clientHealthScore: parseInt(clientHealthScore) || 50,
        reviewedAt: new Date(),
        reviewedBy: userId
      };

      console.log("📦 Saving review with:", {
        supportTickets: reviewData.supportTickets,
        delivered: reviewData.delivered
      });

      // Save review
      const review = await ClientReview.findOneAndUpdate(
        { companyId },
        reviewData,
        { new: true, upsert: true }
      );

      // Update deal with review reference
      await Deal.findByIdAndUpdate(dealId, {
        clientReviewId: review._id
      });

      // Create review object for metrics
      const reviewForMetrics = {
        ...review.toObject(),
        delivered: reviewData.delivered,
        supportTickets: reviewData.supportTickets
      };

      // Calculate all metrics from the review
      const updatedClient = await calculateMetricsFromReview(
        companyId, 
        companyName, 
        reviewForMetrics
      );

      res.status(201).json({
        success: true,
        data: {
          review,
          client: updatedClient
        },
        message: "Review saved successfully. Client metrics calculated."
      });

    } catch (error) {
      console.error("❌ Error in createClientReview:", error);
      res.status(500).json({ 
        success: false, 
        message: error.message
      });
    }
  },

  /**
   * CRITICAL: Endpoint to sync follow-up data after updates
   */
  // In your controller, add this endpoint
syncFollowUpData: async (req, res) => {
  try {
    const { companyName } = req.params;
    const decodedName = decodeURIComponent(companyName);

    console.log("🔄 SYNC - Syncing follow-up data for:", decodedName);

    const deal = await Deal.findOne({ companyName: decodedName }).lean();
    
    if (!deal) {
      return res.status(404).json({
        success: false,
        message: "No deal found for this company"
      });
    }

    // Only process Closed Won deals
    if (deal.stage !== "Closed Won") {
      return res.json({
        success: true,
        message: "Deal is not Closed Won - no CLV data to update",
        data: null
      });
    }

    // Get fresh follow-up metrics
    const followUpMetrics = await getFollowUpMetrics(deal._id);
    
    console.log(`📊 SYNC - Fresh follow-up metrics for ${decodedName}:`, {
      dealId: deal._id,
      historyLength: deal.followUpHistory?.length,
      calculatedCount: followUpMetrics.count,
      lastDate: followUpMetrics.lastDate,
      daysSince: followUpMetrics.daysSince
    });

    // Update ClientLTV
    const updatedClient = await recalculateMetricsFromDeal(deal._id, decodedName);

    res.json({
      success: true,
      data: {
        followUpCount: followUpMetrics.count,
        lastFollowUpDate: followUpMetrics.lastDate,
        daysSinceFollowUp: followUpMetrics.daysSince,
        client: updatedClient
      },
      message: "Follow-up data synced successfully. Days inactive updated."
    });

  } catch (error) {
    console.error("Error in syncFollowUpData:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
},

  refreshClientMetrics: async (req, res) => {
    try {
      const { companyName } = req.params;
      const decodedName = decodeURIComponent(companyName);

      console.log("🔄 Refreshing metrics for:", decodedName);

      const deal = await Deal.findOne({ companyName: decodedName }).lean();
      
      if (!deal) {
        return res.status(404).json({
          success: false,
          message: "No deal found for this company"
        });
      }

      const updatedClient = await recalculateMetricsFromDeal(deal._id, decodedName);

      res.json({
        success: true,
        data: updatedClient,
        message: "Client metrics refreshed successfully"
      });

    } catch (error) {
      console.error("Error in refreshClientMetrics:", error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  getCLVDashboard: async (req, res) => {
  try {
    console.log("Fetching CLV dashboard data...");

    await cleanupInvalidClients();

    const clients = await ClientLTV.find()
      .populate("latestReview")
      .lean();

    console.log(`Found ${clients.length} clients in LTV collection`);
    
    // Apply dynamic days calculation to all clients
    const clientsWithDynamicDays = clients.map(client => {
      let dynamicDaysSinceFollowUp = 365;
      if (client.lastFollowUpDate) {
        const lastDate = new Date(client.lastFollowUpDate);
        const now = new Date();
        lastDate.setHours(0, 0, 0, 0);
        now.setHours(0, 0, 0, 0);
        const diffTime = now - lastDate;
        dynamicDaysSinceFollowUp = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
      }
      
      return {
        ...client,
        daysSinceFollowUp: dynamicDaysSinceFollowUp
      };
    });
    
    const classificationCounts = {
      "Upsell": 0,
      "Top Value": 0,
      "Dormant": 0,
      "At Risk": 0
    };

    const valueCategoryCounts = {
      "High Value": 0,
      "Medium Value": 0,
      "Low Value": 0,
    };

    clientsWithDynamicDays.forEach(c => {
      if (c.classification) {
        classificationCounts[c.classification] = (classificationCounts[c.classification] || 0) + 1;
      }
      if (c.valueCategory) {
        valueCategoryCounts[c.valueCategory] = (valueCategoryCounts[c.valueCategory] || 0) + 1;
      }
    });

    const totalCLV = clientsWithDynamicDays.reduce((sum, c) => sum + (c.customerLifetimeValue || 0), 0);
    const avgCLV = clientsWithDynamicDays.length ? totalCLV / clientsWithDynamicDays.length : 0;
    
    const atRiskCount = classificationCounts["At Risk"] || 0;
    const dormantCount = classificationCounts["Dormant"] || 0;
    const totalRisky = atRiskCount + dormantCount;
    const avgRiskScore = clientsWithDynamicDays.length > 0 
      ? Math.round((totalRisky / clientsWithDynamicDays.length) * 100) 
      : 0;

    const topClients = clientsWithDynamicDays
      .filter(c => c.classification === "Top Value")
      .sort((a, b) => (b.customerLifetimeValue || 0) - (a.customerLifetimeValue || 0))
      .slice(0, 10)
      .map(c => ({
        companyName: c.companyName,
        clv: c.customerLifetimeValue,
        classification: c.classification,
        valueCategory: c.valueCategory,
        daysSinceFollowUp: c.daysSinceFollowUp,
        lastActivity: c.lastFollowUpDate,
        progress: c.latestReview?.progress,
        supportPoints: c.supportPoints,
        supportTickets: c.totalSupportTickets,
        followUpCount: c.followUpCount,
        delivered: c.delivered,
        clientHealthScore: c.clientHealthScore
      }));

    const riskyClients = clientsWithDynamicDays
      .filter(c => c.classification === "At Risk")
      .slice(0, 10)
      .map(c => ({
        companyName: c.companyName,
        daysSinceFollowUp: c.daysSinceFollowUp,
        supportTickets: c.totalSupportTickets,
        progress: c.progress,
        supportPoints: c.supportPoints,
        classificationReason: c.classificationReason,
        delivered: c.delivered,
        clientHealthScore: c.clientHealthScore
      }));

    const dormantClients = clientsWithDynamicDays
      .filter(c => c.classification === "Dormant")
      .slice(0, 10)
      .map(c => ({
        companyName: c.companyName,
        daysSinceFollowUp: c.daysSinceFollowUp,
        lastFollowUp: c.lastFollowUpDate,
        classificationReason: c.classificationReason,
        supportTickets: c.totalSupportTickets,
        delivered: c.delivered,
        clientHealthScore: c.clientHealthScore
      }));

    const upsellClients = clientsWithDynamicDays
      .filter(c => c.classification === "Upsell")
      .slice(0, 10)
      .map(c => ({
        companyName: c.companyName,
        clv: c.customerLifetimeValue,
        classification: c.classification,
        progress: c.latestReview?.progress,
        supportTickets: c.totalSupportTickets,
        delivered: c.delivered,
        clientHealthScore: c.clientHealthScore,
        daysSinceFollowUp: c.daysSinceFollowUp
      }));

    // All clients list for modal
    const allClientsList = clientsWithDynamicDays
      .slice(0, 20)
      .map(c => ({
        companyName: c.companyName,
        dealValue: c.customerLifetimeValue,
        progress: c.progress,
        supportPoints: c.supportPoints,
        followUpCount: c.followUpCount,
        classification: c.classification,
        classificationReason: c.classificationReason,
        delivered: c.delivered,
        supportTickets: c.totalSupportTickets,
        clientHealthScore: c.clientHealthScore,
        daysSinceFollowUp: c.daysSinceFollowUp
      }));

    const recentReviews = await ClientReview.find()
      .sort({ reviewedAt: -1 })
      .limit(5)
      .populate("reviewedBy", "firstName lastName")
      .lean();

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const revenueTrends = await Deal.aggregate([
      {
        $match: {
          stage: "Closed Won",
          wonAt: { $exists: true, $ne: null, $gte: sixMonthsAgo }
        }
      },
      {
        $addFields: {
          numericValue: {
            $toDouble: {
              $reduce: {
                input: { $regexFindAll: { input: "$value", regex: "\\d+" } },
                initialValue: "",
                in: { $concat: ["$$value", "$$this.match"] }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$wonAt" },
            month: { $month: "$wonAt" }
          },
          revenue: { $sum: "$numericValue" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      { $limit: 12 }
    ]);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const formattedTrends = revenueTrends.map(item => ({
      month: `${monthNames[item._id.month - 1]} ${item._id.year}`,
      revenue: item.revenue || 0,
      count: item.count || 0
    }));

    const now = new Date();
    const allMonths = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      const existing = formattedTrends.find(t => t.month === monthStr);
      allMonths.push(existing || { month: monthStr, revenue: 0, count: 0 });
    }

    res.json({
      success: true,
      data: {
        summary: {
          totalClients: clientsWithDynamicDays.length,
          totalCLV,
          avgCLV,
          avgRiskScore,
          upsellCount: classificationCounts["Upsell"],
          topValueCount: classificationCounts["Top Value"],
          dormantCount: classificationCounts["Dormant"],
          atRiskCount: classificationCounts["At Risk"],
        },
        valueCategories: valueCategoryCounts,
        classificationDistribution: classificationCounts,
        topClients,
        riskyClients,
        dormantClients,
        upsellClients,
        allClientsList,
        recentReviews,
        revenueTrends: allMonths,
        pricingRiskAlerts: []
      },
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
},

  getClientCLV: async (req, res) => {
  try {
    const { companyName } = req.params;
    const decoded = decodeURIComponent(companyName);

    const client = await ClientLTV.findOne({ companyName: decoded }).lean();
    if (!client) {
      return res.status(404).json({ success: false, message: "Client not found" });
    }

    // 🔥 DYNAMIC CALCULATION: Recalculate days since follow-up
    let dynamicDaysSinceFollowUp = 365;
    if (client.lastFollowUpDate) {
      const lastDate = new Date(client.lastFollowUpDate);
      const now = new Date();
      lastDate.setHours(0, 0, 0, 0);
      now.setHours(0, 0, 0, 0);
      const diffTime = now - lastDate;
      dynamicDaysSinceFollowUp = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
    }

    // Create a copy of client with dynamic days
    const clientWithDynamicDays = {
      ...client,
      daysSinceFollowUp: dynamicDaysSinceFollowUp
    };

    const activeDeal = await Deal.findOne({
      _id: client.companyId,
      stage: "Closed Won"
    }).lean();
    
    if (!activeDeal) {
      await ClientLTV.findOneAndDelete({ companyId: client.companyId });
      return res.status(404).json({ 
        success: false, 
        message: "Client no longer has active Closed Won deals" 
      });
    }

    const [deals, tickets, renewals, reviews, pricingRisk] = await Promise.all([
      Deal.find({ companyName: decoded, stage: "Closed Won" })
        .populate("assignedTo", "firstName lastName")
        .sort({ wonAt: -1, createdAt: -1 })
        .lean(),

      client.companyId
        ? SupportTicket.find({ companyId: client.companyId }).sort({ openedAt: -1 }).lean()
        : [],

      Renewal.find({ companyName: decoded }).sort({ renewalDate: -1 }).lean(),

      ClientReview.find({ companyId: client.companyId }).sort({ reviewedAt: -1 }).lean(),

      client.companyId
        ? PricingRisk.findOne({ companyId: client.companyId, status: "Active" }).lean()
        : null
    ]);

    const totalTickets = tickets.length;
    const openTickets = tickets.filter(t => t.status === "Open").length;
    const lastSupportDate = totalTickets ? tickets[0].openedAt : null;

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const recentTickets = tickets.filter(t => new Date(t.openedAt) >= sixMonthsAgo);
    const ticketsPerMonth = recentTickets.length / 6;

    let avgResolutionDays = 0;
    const closedTickets = tickets.filter(t => t.status === "Closed" && t.resolutionTimeHours);
    if (closedTickets.length > 0) {
      const totalHours = closedTickets.reduce((sum, t) => sum + (t.resolutionTimeHours || 0), 0);
      avgResolutionDays = totalHours / 24 / closedTickets.length;
    }

    const supportToRevenueRatio = client.totalRevenue > 0
      ? (totalTickets / client.totalRevenue) * 1000000
      : 0;

    const supportAnalysis = {
      totalTickets,
      openTickets,
      lastSupportDate,
      ticketsPerMonth: ticketsPerMonth.toFixed(1),
      avgResolutionDays: avgResolutionDays.toFixed(1),
      supportToRevenueRatio: supportToRevenueRatio.toFixed(2),
      supportPoints: client.supportPoints
    };

    res.json({
      success: true,
      data: {
        client: clientWithDynamicDays, // Use the one with dynamic days
        deals,
        tickets,
        renewals,
        reviews,
        pricingRisk,
        supportAnalysis,
      },
    });
  } catch (error) {
    console.error("Get client error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
},

  calculateAllCLV: async (req, res) => {
    try {
      const reviews = await ClientReview.find().lean();
      const results = [];
      const errors = [];

      for (const review of reviews) {
        try {
          const result = await calculateMetricsFromReview(review.companyId, review.companyName, review);
          if (result) results.push(result);
        } catch (err) {
          errors.push({ companyName: review.companyName, error: err.message });
        }
      }

      res.json({
        success: true,
        count: results.length,
        errors: errors.length ? errors : undefined,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  createSupportTicket: async (req, res) => {
    try {
      const { companyName, companyId, subject, description, priority, category } = req.body;

      if (!companyName || !companyId || !subject || !description) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields"
        });
      }

      const userId = req.user?._id || req.user?.id;

      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const count = await SupportTicket.countDocuments();
      const ticketNumber = `TKT-${year}${month}-${(count + 1).toString().padStart(4, "0")}`;

      const ticket = new SupportTicket({
        ticketNumber,
        companyName,
        companyId,
        subject,
        description,
        priority: priority || "Medium",
        category: category || "General",
        openedAt: new Date(),
        createdBy: userId,
      });

      await ticket.save();

      // After creating ticket, refresh client metrics
      await recalculateMetricsFromDeal(companyId, companyName);

      res.status(201).json({ success: true, data: ticket });
    } catch (error) {
      console.error("Create ticket error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  createRenewal: async (req, res) => {
    try {
      const { dealId, companyName, renewalDate, renewalValue, currency } = req.body;

      if (!dealId || !companyName || !renewalDate || !renewalValue) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields"
        });
      }

      const renewal = new Renewal({
        dealId,
        companyName,
        renewalDate,
        renewalValue: parseFloat(renewalValue.toString().replace(/[^0-9.-]+/g, '')) || 0,
        currency: currency || "INR",
        assignedTo: req.user?._id || req.user?.id,
      });

      await renewal.save();

      res.status(201).json({ success: true, data: renewal });
    } catch (error) {
      console.error("Create renewal error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  getPricingRisks: async (req, res) => {
    try {
      const risks = await PricingRisk.find({ status: "Active" })
        .sort({ detectedAt: -1 })
        .limit(50)
        .lean();

      res.json({ success: true, data: risks });
    } catch (error) {
      console.error("Error in getPricingRisks:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  resolvePricingRisk: async (req, res) => {
    try {
      const { id } = req.params;

      await PricingRisk.findByIdAndUpdate(id, {
        status: "Resolved",
        resolvedAt: new Date()
      });

      res.json({ success: true, message: "Risk resolved" });
    } catch (error) {
      console.error("Error in resolvePricingRisk:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  getPricingRecommendation: async (req, res) => {
  try {
    const { companyName } = req.params; // Note: this is companyName, not companyId
    const decodedName = decodeURIComponent(companyName);
    
    console.log("Pricing recommendation requested for:", decodedName);
    
    const client = await ClientLTV.findOne({ companyName: decodedName }).lean();
    
    if (!client) {
      return res.status(200).json({ 
        success: false, 
        message: "Client not found in CLV system",
        data: null
      });
    }

    const latestReview = await ClientReview.findOne({ companyId: client.companyId })
      .sort({ reviewedAt: -1 })
      .lean();

    const metrics = {
      progress: latestReview?.progress || client.progress || "Average",
      supportTickets: client.totalSupportTickets || 0,
      clientHealthScore: latestReview?.clientHealthScore || client.clientHealthScore || 50,
      delivered: client.delivered || false,
      totalRevenue: client.customerLifetimeValue || 0
    };

    const pricing = calculatePricingRecommendation(metrics);

    res.json({
      success: true,
      data: {
        ...pricing,
        classification: client.classification
      }
    });

  } catch (error) {
    console.error("Error in getPricingRecommendation:", error);
    res.status(200).json({ 
      success: false, 
      message: error.message || "Error calculating pricing recommendation",
      data: null
    });
  }
}
};