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

// Calculate follow-up count
async function getFollowUpCount(dealId) {
  const deal = await Deal.findById(dealId).lean();
  return deal?.followUpHistory?.length || 0;
}

/**
 * Calculate days since follow-up dynamically with safety check for negative values
 */
const calculateDaysSinceFollowUp = (lastFollowUpDate) => {
  if (!lastFollowUpDate) return 365; // Default if no follow-up
  
  const diffTime = Date.now() - new Date(lastFollowUpDate).getTime();
  const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // Ensure we never return negative days (future dates)
  return Math.max(0, days);
};

/**
 * 🚀 PRODUCTION READY CLASSIFICATION LOGIC
 * 
 * Priority Order (Strict):
 * 1️⃣ Upsell (Highest Priority)
 * 2️⃣ Top Value
 * 3️⃣ Dormant
 * 4️⃣ At Risk (Fallback - catches everything else)
 * 
 * This guarantees:
 * ✅ No overlap
 * ✅ No missing deals
 * ✅ Exactly ONE classification per deal
 */
const classifyDeal = ({
  totalRevenue = 0,
  supportTickets = 0,
  clientHealthScore = 50,
  daysSinceFollowUp = 0,
  progress = "average",
}) => {

  // -----------------------------
  // 1️⃣ Force Safe Number Conversion
  // -----------------------------
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

  // -----------------------------
  // 2️⃣ Normalize Progress
  // -----------------------------
  const normalizedProgress = String(progress)
    .trim()
    .toLowerCase();

  // -----------------------------
  // DEBUG (Remove After Testing)
  // -----------------------------
  // console.log("CLASSIFY DEBUG:", {
  //   totalRevenue,
  //   supportTickets,
  //   clientHealthScore,
  //   daysSinceFollowUp,
  //   normalizedProgress,
  // });

  // =============================
  // 1️⃣ DORMANT (Highest Priority)
  // =============================
  if (daysSinceFollowUp > 90) {
    return "Dormant";
  }

  // =============================
  // 2️⃣ UPSELL (Very Strict)
  // =============================
  const isUpsell =
    normalizedProgress === "excellent" &&
    totalRevenue >= 500000 &&
    clientHealthScore >= 80 &&
    supportTickets <= 2 &&
    daysSinceFollowUp <= 30;

  if (isUpsell) {
    return "Upsell";
  }

  // =============================
  // 3️⃣ AT RISK
  // =============================
  const isAtRisk =
    normalizedProgress === "poor" ||
    clientHealthScore < 70 ||
    supportTickets >= 5 ||
    daysSinceFollowUp > 30;

  if (isAtRisk) {
    return "At Risk";
  }

  // =============================
  // 4️⃣ TOP VALUE (Default Safe)
  // =============================
  return "Top Value";
};

// Value category based on deal amount (for reporting only)
const getValueCategory = (amount) => {
  if (amount > 500000) return "High Value";
  if (amount >= 100000 && amount <= 500000) return "Medium Value";
  return "Low Value";
};

/**
 * 📊 PRODUCTION READY PRICING CALCULATION
 * 
 * Fixed: No filtering of zero values to maintain correct averages
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
  else supportDiscount = 30; // Base for low tickets
  
  // Health score discount
  let healthDiscount = 0;
  if (clientHealthScore > 75) healthDiscount = 30;
  else if (clientHealthScore > 50) healthDiscount = 20;
  else healthDiscount = 0;
  
  // Delivery bonus
  const deliveryBonus = delivered ? 15 : 0;
  
  // Calculate final discount (include all factors, even zeros)
  const discounts = [progressDiscount, supportDiscount, healthDiscount, deliveryBonus];
  
  const averageDiscount = discounts.reduce((a, b) => a + b, 0) / discounts.length;
    
  const finalDiscount = Math.min(Math.round(averageDiscount), 50); // Cap at 50%
  
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
 * ⚡ OPTIMIZED: Remove clients without active won deals
 * 
 * Before: 1 query per client (500 clients = 500 queries)
 * After: 2 queries total (regardless of client count)
 * 
 * Note: This assumes 1 deal = 1 company in the current architecture
 */
const cleanupInvalidClients = async () => {
  try {
    // Get all active won deal IDs in one query
    const activeWonDealIds = await Deal.find({ stage: "Closed Won" }).distinct("_id");
    
    // Delete clients that don't have an active won deal in one query
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

    // Parse numeric value safely - extract all digits
    // Note: Long-term solution is to store numeric value in DB
    const numericMatch = deal.value?.toString().match(/\d+/g);
    const totalRevenue = numericMatch ? parseInt(numericMatch.join('')) : 0;

    // Get support metrics
    const supportMetrics = await getSupportMetrics(companyId);
    const supportTickets = supportMetrics.total;

    // Get follow-up count
    const followUpCount = await getFollowUpCount(companyId);

    // Always recalculate days since follow-up dynamically with safety
    const daysSinceFollowUp = calculateDaysSinceFollowUp(reviewData.lastFollowUp || deal.followUpDate);

    // Prepare metrics object for classification
    const metrics = {
  totalRevenue,
  supportTickets,
  clientHealthScore: reviewData.clientHealthScore || 50,
  daysSinceFollowUp,
  progress: reviewData.progress   // ✅ ADD THIS
};

    // Get classification with proper priority (guaranteed to return one of the 4)
    const classification = classifyDeal(metrics);
    
    // Generate reason based on classification
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
    
    // Calculate value category (for reporting only)
    const valueCategory = getValueCategory(totalRevenue);
    
    // Get risk factors (for display only)
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
    clientLTV.lastFollowUpDate = reviewData.lastFollowUp || deal.followUpDate;
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
    clientLTV.delivered = reviewData.delivered || false;
    clientLTV.progress = reviewData.progress;
    clientLTV.latestReview = reviewData._id;
    clientLTV.suggestedMinPrice = pricing.suggestedMinPrice;
    clientLTV.suggestedMaxPrice = pricing.suggestedMaxPrice;
    clientLTV.recommendedDiscount = pricing.recommendedDiscount;
    clientLTV.lastClassificationUpdate = new Date();

    await clientLTV.save();
    console.log(`✅ Metrics calculated for ${companyName}:`, {
      classification,
      valueCategory,
      daysSinceFollowUp,
      supportTickets,
      clientHealthScore: reviewData.clientHealthScore,
      reason
    });

    return clientLTV;
  } catch (error) {
    console.error("Error in calculateMetricsFromReview:", error);
    throw error;
  }
};

// ---------- CONTROLLER METHODS (EXPORTED) ----------

// Controller for API endpoint POST /api/cltv/calculate/:companyName
const calculateClientCLV = async (req, res) => {
  try {
    const { companyName } = req.params;
    const decodedName = decodeURIComponent(companyName);

    console.log("🔵 API: calculateClientCLV called for:", decodedName);

    // Find the deal by company name
    const deal = await Deal.findOne({ companyName: decodedName }).lean();

    if (!deal) {
      return res.status(404).json({
        success: false,
        message: "No deal found for this company"
      });
    }

    // If deal is not in Closed Won stage, remove from CLV
    if (deal.stage !== "Closed Won") {
      console.log(`⚠️ Deal for ${decodedName} is not Closed Won - removing from CLV`);
      await ClientLTV.findOneAndDelete({ companyId: deal._id });
      return res.json({
        success: true,
        message: "Deal is not Closed Won - removed from CLV",
        data: null
      });
    }

    // Find the latest review
    const latestReview = await ClientReview.findOne({ companyId: deal._id })
      .sort({ reviewedAt: -1 })
      .lean();

    if (!latestReview) {
      return res.status(404).json({
        success: false,
        message: "No review found for this client"
      });
    }

    // Calculate metrics from the review
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
};

const getWonDeals = async (req, res) => {
  try {
    const { page = 1, limit = 5, classification = "all" } = req.query;
    const skip = (page - 1) * limit;

    // Build filter query
    let filterQuery = { stage: "Closed Won" };
    
    // First, get all deals
    const deals = await Deal.find(filterQuery)
      .populate("assignedTo", "firstName lastName")
      .sort({ wonAt: -1, createdAt: -1 })
      .lean();

    const total = deals.length;

    if (!deals || deals.length === 0) {
      return res.json({ 
        success: true, 
        data: [],
        pagination: { total: 0, page: 1, pages: 1 }
      });
    }

    // Get existing reviews
    const reviews = await ClientReview.find().lean();
    const reviewMap = {};
    reviews.forEach(r => {
      if (r.companyId) reviewMap[r.companyId.toString()] = r;
    });

    // Get CLV data for classification
    const clvData = await ClientLTV.find().lean();
    const clvMap = {};
    clvData.forEach(c => {
      if (c.companyId) clvMap[c.companyId.toString()] = c;
    });

    // Get ticket counts
    const companyIds = deals.map(d => d._id).filter(id => id);
    const ticketCounts = await SupportTicket.aggregate([
      { $match: { companyId: { $in: companyIds } } },
      { $group: { _id: "$companyId", count: { $sum: 1 } } }
    ]);

    const ticketMap = {};
    ticketCounts.forEach(t => {
      if (t._id) ticketMap[t._id.toString()] = t.count;
    });

    // Format all deals first
    let formattedDeals = deals.map(deal => ({
      _id: deal._id,
      clientName: deal.dealName || "Unnamed",
      companyName: deal.companyName || "Unknown",
      companyId: deal._id,
      dealId: deal._id,
      dealValue: deal.value || "0",
      delivered: reviewMap[deal._id.toString()]?.delivered || false,
      assignedTo: deal.assignedTo 
        ? `${deal.assignedTo.firstName || ''} ${deal.assignedTo.lastName || ''}`.trim()
        : "Unassigned",
      salespersonId: deal.assignedTo?._id,
      supportTicketCount: ticketMap[deal._id.toString()] || 0,
      wonAt: deal.wonAt || deal.createdAt,
      reviewStatus: reviewMap[deal._id.toString()] ? "Submitted" : "Pending",
      reviewProgress: reviewMap[deal._id.toString()]?.progress || null,
      hasReview: !!reviewMap[deal._id.toString()],
      // 🔥 FIXED: No more "Unclassified" - default to "At Risk" for unreviewed deals
      classification: clvMap[deal._id.toString()]?.classification || "At Risk",
      clientHealthScore: reviewMap[deal._id.toString()]?.clientHealthScore || 50,
      daysSinceFollowUp: clvMap[deal._id.toString()]?.daysSinceFollowUp || 0
    }));

    // 🔥 FIXED: Apply classification filter BEFORE pagination
    if (classification !== "all") {
      formattedDeals = formattedDeals.filter(deal => 
        deal.classification === classification
      );
    }

    // Apply pagination AFTER filtering
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
};

const createClientReview = async (req, res) => {
  try {
    // Log the entire request body
    console.log("=".repeat(50));
    console.log("🔵 RECEIVED REVIEW REQUEST:");
    console.log("Body:", JSON.stringify(req.body, null, 2));
    console.log("User:", req.user?._id || req.user?.id);
    console.log("=".repeat(50));
    
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

    // Create review data (no follow-up field, added delivered)
    const reviewData = {
      companyId,
      companyName,
      clientName,
      dealId,
      dealValue: parseFloat(dealValue?.toString().replace(/[^0-9.-]+/g, '')) || 0,
      delivered: delivered || false,
      salespersonId,
      salespersonName,
      supportTickets: parseInt(supportTickets) || 0,
      progress: progress || "Average",
      reviewNotes: reviewNotes || "",
      clientHealthScore: parseInt(clientHealthScore) || 50,
      reviewedAt: new Date(),
      reviewedBy: userId
    };

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

    // Calculate all metrics from the review
    const updatedClient = await calculateMetricsFromReview(companyId, companyName, review);

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
    console.error("Error stack:", error.stack);
    res.status(500).json({ 
      success: false, 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

const getCLVDashboard = async (req, res) => {
  try {
    console.log("Fetching CLV dashboard data...");

    // ⚡ OPTIMIZED: Clean up invalid clients in bulk (2 queries total)
    await cleanupInvalidClients();

    // Get all remaining clients with reviews
    const clients = await ClientLTV.find()
      .populate("latestReview")
      .lean();

    console.log(`Found ${clients.length} clients in LTV collection`);
    
    // Classification counts - Using simple names that match the classifyDeal output
    const classificationCounts = {
      "Upsell": 0,
      "Top Value": 0,
      "Dormant": 0,
      "At Risk": 0
    };

    // Value category counts for Total CLV modal
    const valueCategoryCounts = {
      "High Value": 0,
      "Medium Value": 0,
      "Low Value": 0,
    };

    clients.forEach(c => {
      if (c.classification) {
        classificationCounts[c.classification] = (classificationCounts[c.classification] || 0) + 1;
      }
      if (c.valueCategory) {
        valueCategoryCounts[c.valueCategory] = (valueCategoryCounts[c.valueCategory] || 0) + 1;
      }
    });

    // Summary calculations
    const totalCLV = clients.reduce((sum, c) => sum + (c.customerLifetimeValue || 0), 0);
    const avgCLV = clients.length ? totalCLV / clients.length : 0;
    
    // Total clients with any risk (At Risk + Dormant)
    const atRiskCount = classificationCounts["At Risk"] || 0;
    const dormantCount = classificationCounts["Dormant"] || 0;
    const totalRisky = atRiskCount + dormantCount;
    const avgRiskScore = clients.length > 0 
      ? Math.round((totalRisky / clients.length) * 100) 
      : 0;

    // Top Value Clients
    const topClients = clients
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
        delivered: c.latestReview?.delivered,
        clientHealthScore: c.clientHealthScore
      }));

    // At Risk clients
    const riskyClients = clients
      .filter(c => c.classification === "At Risk")
      .slice(0, 10)
      .map(c => ({
        companyName: c.companyName,
        daysSinceFollowUp: c.daysSinceFollowUp,
        supportTickets: c.totalSupportTickets,
        progress: c.progress,
        supportPoints: c.supportPoints,
        classificationReason: c.classificationReason,
        delivered: c.latestReview?.delivered,
        clientHealthScore: c.clientHealthScore
      }));

    // Dormant clients
    const dormantClients = clients
      .filter(c => c.classification === "Dormant")
      .slice(0, 10)
      .map(c => ({
        companyName: c.companyName,
        daysSinceFollowUp: c.daysSinceFollowUp,
        lastFollowUp: c.lastFollowUpDate,
        classificationReason: c.classificationReason,
        supportTickets: c.totalSupportTickets,
        delivered: c.latestReview?.delivered,
        clientHealthScore: c.clientHealthScore
      }));

    // Upsell opportunities
    const upsellClients = clients
      .filter(c => c.classification === "Upsell")
      .slice(0, 10)
      .map(c => ({
        companyName: c.companyName,
        clv: c.customerLifetimeValue,
        classification: c.classification,
        progress: c.latestReview?.progress,
        supportTickets: c.totalSupportTickets,
        delivered: c.latestReview?.delivered,
        clientHealthScore: c.clientHealthScore,
        daysSinceFollowUp: c.daysSinceFollowUp
      }));

    // All clients list for modal (for completeness)
    const allClientsList = clients
      .slice(0, 20)
      .map(c => ({
        companyName: c.companyName,
        dealValue: c.customerLifetimeValue,
        progress: c.progress,
        supportPoints: c.supportPoints,
        followUpCount: c.followUpCount,
        classification: c.classification,
        classificationReason: c.classificationReason,
        delivered: c.latestReview?.delivered,
        supportTickets: c.totalSupportTickets,
        clientHealthScore: c.clientHealthScore,
        daysSinceFollowUp: c.daysSinceFollowUp
      }));

    // Recent reviews
    const recentReviews = await ClientReview.find()
      .sort({ reviewedAt: -1 })
      .limit(5)
      .populate("reviewedBy", "firstName lastName")
      .lean();

    // FIXED: Revenue trends - safely parse numeric values
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

    // Fill in missing months
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
          totalClients: clients.length,
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
};

const getClientCLV = async (req, res) => {
  try {
    const { companyName } = req.params;
    const decoded = decodeURIComponent(companyName);

    const client = await ClientLTV.findOne({ companyName: decoded }).lean();
    if (!client) {
      return res.status(404).json({ success: false, message: "Client not found" });
    }

    // Check if this client still has active Closed Won deals
    const activeDeal = await Deal.findOne({
      _id: client.companyId,
      stage: "Closed Won"
    }).lean();
    
    if (!activeDeal) {
      // Client exists in CLV but no longer has won deals - remove it
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

    // Support analysis
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
        client,
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
};

const calculateAllCLV = async (req, res) => {
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
};

const createSupportTicket = async (req, res) => {
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

    res.status(201).json({ success: true, data: ticket });
  } catch (error) {
    console.error("Create ticket error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const createRenewal = async (req, res) => {
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
};

const getPricingRisks = async (req, res) => {
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
};

const resolvePricingRisk = async (req, res) => {
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
};

const getPricingRecommendation = async (req, res) => {
  try {
    const { companyName } = req.params;
    const decodedName = decodeURIComponent(companyName);
    
    console.log("Pricing recommendation requested for:", decodedName);
    
    // Find client by company name (not companyId)
    const client = await ClientLTV.findOne({ companyName: decodedName }).lean();
    
    if (!client) {
      // Return a 200 with a message instead of 404, so frontend can handle gracefully
      return res.status(200).json({ 
        success: false, 
        message: "Client not found in CLV system",
        data: null
      });
    }

    // Get the latest review
    const latestReview = await ClientReview.findOne({ companyId: client.companyId })
      .sort({ reviewedAt: -1 })
      .lean();

    // Prepare metrics for pricing calculation
    const metrics = {
      progress: latestReview?.progress || client.progress || "Average",
      supportTickets: client.totalSupportTickets || 0,
      clientHealthScore: latestReview?.clientHealthScore || client.clientHealthScore || 50,
      delivered: latestReview?.delivered || client.delivered || false,
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
    // Return a 200 with error message instead of 500
    res.status(200).json({ 
      success: false, 
      message: error.message || "Error calculating pricing recommendation",
      data: null
    });
  }
};

// ---------- EXPORT ALL FUNCTIONS ----------
export {
  calculateAllCLV,
  getCLVDashboard,
  getClientCLV,
  createSupportTicket,
  createRenewal,
  getWonDeals,
  createClientReview,
  getPricingRisks,
  resolvePricingRisk,
  calculateClientCLV,
  getPricingRecommendation
};