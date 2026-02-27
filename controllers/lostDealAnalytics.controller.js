// backend/controllers/lostDealAnalytics.controller.js
import Deal from "../models/deals.model.js";

export const getLostDealAnalytics = async (req, res) => {
  try {
    const { 
      timeframe = "month", 
      startDate, 
      endDate, 
      reason, 
      assignedTo, 
      industry 
    } = req.query;
    
    const userId = req.user?._id;
    const userRole = req.user?.role?.name;

    console.log("Fetching lost deal analytics with filters:", {
      timeframe,
      startDate,
      endDate,
      reason,
      assignedTo,
      industry,
      userRole,
      userId
    });

    // Build date filter
    let dateFilter = {};
    
    if (startDate || endDate) {
      dateFilter.updatedAt = {};
      if (startDate) dateFilter.updatedAt.$gte = new Date(startDate);
      if (endDate) dateFilter.updatedAt.$lte = new Date(endDate);
    } else {
      // Default date range based on timeframe
      const now = new Date();
      switch (timeframe) {
        case "week":
          dateFilter.updatedAt = { $gte: new Date(now.setDate(now.getDate() - 7)) };
          break;
        case "month":
          dateFilter.updatedAt = { $gte: new Date(now.setMonth(now.getMonth() - 1)) };
          break;
        case "quarter":
          dateFilter.updatedAt = { $gte: new Date(now.setMonth(now.getMonth() - 3)) };
          break;
        case "year":
          dateFilter.updatedAt = { $gte: new Date(now.setFullYear(now.getFullYear() - 1)) };
          break;
        case "all":
        default:
          dateFilter = {};
          break;
      }
    }

    // Build query for lost deals
    let dealQuery = { 
      $or: [
        { stage: "Closed Lost" },
        { stage: "Lost" }
      ]
    };
    
    // Apply date filter
    if (Object.keys(dateFilter).length > 0) {
      dealQuery = { ...dealQuery, ...dateFilter };
    }

    // Apply reason filter
    if (reason) {
      dealQuery.lossReason = reason;
    }

    // Apply industry filter
    if (industry) {
      dealQuery.industry = industry;
    }

    // Role-based access control
    if (userRole !== "Admin") {
      dealQuery.assignedTo = userId;
    }

    // Get all lost deals
    const lostDeals = await Deal.find(dealQuery)
      .populate("assignedTo", "firstName lastName email")
      .populate("leadId")
      .sort({ updatedAt: -1 });

    console.log(`Found ${lostDeals.length} lost deals`);

    // Helper function to parse value string to number
    const parseValue = (valueString) => {
      if (!valueString) return 0;
      if (typeof valueString === 'number') return valueString;
      // Remove non-numeric characters (keep only digits)
      const numericValue = valueString.replace(/[^0-9]/g, "");
      return parseInt(numericValue, 10) || 0;
    };

    // Enhance deals with parsed values and stage info
    const enhancedLostDeals = lostDeals.map(deal => {
      const dealObj = deal.toObject();
      const parsedValue = parseValue(dealObj.value);
      
      return {
        ...dealObj,
        parsedValue,
        stageLost: dealObj.stage, // Use the stage where it was lost
        daysInPipeline: Math.round(
          (new Date(dealObj.updatedAt) - new Date(dealObj.createdAt)) / 
          (1000 * 60 * 60 * 24)
        ) || 0
      };
    });

    // 1. Total Lost Deals & Value
    const totalLostDeals = enhancedLostDeals.length;
    const totalLostValue = enhancedLostDeals.reduce(
      (sum, deal) => sum + (deal.parsedValue || 0), 
      0
    );

    // 2. Monthly Trend
    const monthlyTrend = aggregateMonthlyTrend(enhancedLostDeals, timeframe);

    // 3. Reason Distribution
    const reasonDistribution = aggregateReasonDistribution(enhancedLostDeals);

    // 4. Top Lost Users
    const topLostUsers = aggregateTopLostUsers(enhancedLostDeals);

    // 5. Recent Lost Deals
    const recentLostDeals = enhancedLostDeals.slice(0, 20);

    // 6. Time to Loss Analysis (removed as requested)

    // 7. Industry Analysis
    const industryAnalysis = aggregateIndustryAnalysis(enhancedLostDeals);

    // 8. Deal Size Analysis
    const dealSizeAnalysis = aggregateDealSizeAnalysis(enhancedLostDeals);

    // 9. High Value Deals (over ₹1,00,000)
    const highValueDeals = enhancedLostDeals
      .filter(deal => (deal.parsedValue || 0) >= 100000)
      .sort((a, b) => (b.parsedValue || 0) - (a.parsedValue || 0))
      .slice(0, 10);

    // 10. Statistical Analysis
    const statisticalAnalysis = calculateStatisticalAnalysis(
      enhancedLostDeals, 
      monthlyTrend
    );

    // 11. Stage Analysis
    const stageAnalysis = calculateStageAnalysis(enhancedLostDeals);

    // 12. Recovery Metrics
    const recoveryMetrics = calculateRecoveryMetrics(enhancedLostDeals);

    res.status(200).json({
      success: true,
      data: {
        totalLostDeals,
        totalLostValue,
        monthlyTrend,
        reasonDistribution,
        topLostUsers,
        recentLostDeals,
        industryAnalysis,
        dealSizeAnalysis,
        highValueDeals,
        statisticalAnalysis: {
          ...statisticalAnalysis,
          recoveryRate: recoveryMetrics.averageRecoveryRate,
        },
        stageAnalysis,
        recoveryMetrics,
      },
    });
  } catch (error) {
    console.error("Lost Deal Analytics Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch lost deal analytics",
      error: error.message,
    });
  }
};

export const exportLostDealReport = async (req, res) => {
  try {
    const { format = "csv", timeframe = "month" } = req.query;
    
    // Reuse the analytics logic to get data
    const result = await getLostDealAnalytics(req, res);
    
    if (format === "csv") {
      // Generate CSV
      let csv = "Date Lost,Deal Name,Stage Lost,Value,Loss Reason,Owner,Recovery Potential\n";
      
      // You'll need to access the data from the response
      // This is a simplified version - in production you'd want to fetch the data directly
      
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition", 
        `attachment; filename=lost-deals-${new Date().toISOString().split('T')[0]}.csv`
      );
      res.status(200).send(csv);
    } else {
      res.status(200).json({
        success: true,
        message: "PDF generation not implemented yet",
      });
    }
  } catch (error) {
    console.error("Export Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to export report",
    });
  }
};

// Helper Functions

const aggregateMonthlyTrend = (deals, timeframe) => {
  const trend = [];
  const now = new Date();
  
  let months;
  switch (timeframe) {
    case "week":
      months = 1;
      break;
    case "month":
      months = 3;
      break;
    case "quarter":
      months = 6;
      break;
    case "year":
      months = 12;
      break;
    default:
      months = 6;
  }

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setMonth(date.getMonth() - i);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    
    const monthDeals = deals.filter(deal => {
      const dealDate = new Date(deal.updatedAt);
      return dealDate.getMonth() === date.getMonth() && 
             dealDate.getFullYear() === date.getFullYear();
    });

    trend.push({
      _id: monthKey,
      count: monthDeals.length,
      value: monthDeals.reduce((sum, deal) => sum + (deal.parsedValue || 0), 0),
    });
  }

  return trend;
};

const aggregateReasonDistribution = (deals) => {
  const distribution = {};
  
  deals.forEach(deal => {
    const reason = deal.lossReason || "Unknown";
    distribution[reason] = (distribution[reason] || 0) + 1;
  });

  return Object.entries(distribution)
    .map(([reason, count]) => ({ _id: reason, count }))
    .sort((a, b) => b.count - a.count);
};

const aggregateTopLostUsers = (deals) => {
  const userStats = {};

  deals.forEach(deal => {
    if (deal.assignedTo) {
      const userId = deal.assignedTo._id?.toString();
      if (userId) {
        if (!userStats[userId]) {
          userStats[userId] = {
            _id: userId,
            lostDeals: 0,
            totalValue: 0,
            firstName: deal.assignedTo.firstName,
            lastName: deal.assignedTo.lastName,
            email: deal.assignedTo.email,
          };
        }
        userStats[userId].lostDeals++;
        userStats[userId].totalValue += deal.parsedValue || 0;
      }
    }
  });

  return Object.values(userStats)
    .sort((a, b) => b.lostDeals - a.lostDeals)
    .slice(0, 5);
};

const aggregateIndustryAnalysis = (deals) => {
  const industryStats = {};

  deals.forEach(deal => {
    const industry = deal.industry || "Other";
    if (!industryStats[industry]) {
      industryStats[industry] = {
        _id: industry,
        count: 0,
        value: 0,
      };
    }
    industryStats[industry].count++;
    industryStats[industry].value += deal.parsedValue || 0;
  });

  return Object.values(industryStats)
    .sort((a, b) => b.value - a.value);
};

const aggregateDealSizeAnalysis = (deals) => {
  const sizes = {
    small: { count: 0, value: 0, threshold: 50000 },
    medium: { count: 0, value: 0, threshold: 200000 },
    large: { count: 0, value: 0, threshold: 500000 },
    enterprise: { count: 0, value: 0, threshold: Infinity }
  };

  deals.forEach(deal => {
    const value = deal.parsedValue || 0;
    if (value < 50000) {
      sizes.small.count++;
      sizes.small.value += value;
    } else if (value < 200000) {
      sizes.medium.count++;
      sizes.medium.value += value;
    } else if (value < 500000) {
      sizes.large.count++;
      sizes.large.value += value;
    } else {
      sizes.enterprise.count++;
      sizes.enterprise.value += value;
    }
  });

  return Object.entries(sizes).map(([size, data]) => ({
    _id: size,
    count: data.count,
    value: data.value,
  }));
};

const calculateStatisticalAnalysis = (deals, monthlyTrend) => {
  if (deals.length === 0) {
    return {
      avgDealValue: 0,
      medianDealValue: 0,
      stdDeviation: 0,
      winRate: 0,
      lossRate: 0,
      trend: "stable",
      predictedLosses: 0,
    };
  }

  const values = deals.map(deal => deal.parsedValue || 0);
  
  // Average
  const avgDealValue = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  
  // Median
  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];
  
  // Standard Deviation
  const squareDiffs = values.map(value => Math.pow(value - avgDealValue, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
  const stdDeviation = Math.round(Math.sqrt(avgSquareDiff));

  // Trend analysis
  let trend = "stable";
  if (monthlyTrend.length >= 2) {
    const lastMonth = monthlyTrend[monthlyTrend.length - 1]?.count || 0;
    const prevMonth = monthlyTrend[monthlyTrend.length - 2]?.count || 0;
    if (lastMonth > prevMonth) trend = "increasing";
    else if (lastMonth < prevMonth) trend = "decreasing";
  }

  // Simple prediction (moving average)
  const avgMonthlyLosses = monthlyTrend.length > 0
    ? Math.round(monthlyTrend.reduce((sum, m) => sum + m.count, 0) / monthlyTrend.length)
    : deals.length;

  return {
    avgDealValue,
    medianDealValue: Math.round(median),
    stdDeviation,
    winRate: 0,
    lossRate: deals.length > 0 ? 100 : 0,
    trend,
    predictedLosses: avgMonthlyLosses,
  };
};

const calculateStageAnalysis = (deals) => {
  const stageMap = new Map();
  
  // Define stage order
  const stageOrder = [
    "Prospect",
    "Qualified",
    "Proposal Sent",
    "Negotiation",
    "Demo",
    "Invoice Sent",
    "Closed Lost",
    "Lost",
    "Unknown"
  ];

  deals.forEach(deal => {
    // Get the stage where the deal was lost
    const stage = deal.stage || "Unknown";
    const value = deal.parsedValue || 0;

    if (!stageMap.has(stage)) {
      stageMap.set(stage, {
        stage,
        count: 0,
        totalValue: 0,
      });
    }

    const stageData = stageMap.get(stage);
    stageData.count += 1;
    stageData.totalValue += value;
  });

  const totalDeals = deals.length;
  const totalValue = deals.reduce((sum, deal) => sum + (deal.parsedValue || 0), 0);

  const stageAnalysis = Array.from(stageMap.values())
    .map(stage => ({
      ...stage,
      percentage: totalDeals > 0 ? Math.round((stage.count / totalDeals) * 100) : 0,
      valuePercentage: totalValue > 0 ? Math.round((stage.totalValue / totalValue) * 100) : 0,
      recoveryPotential: calculateStageRecoveryPotential(stage.stage, stage.totalValue),
      recoveryRate: getStageRecoveryRate(stage.stage),
    }))
    .sort((a, b) => {
      // Sort by stage order
      return stageOrder.indexOf(a.stage) - stageOrder.indexOf(b.stage);
    });

  return stageAnalysis;
};

const calculateStageRecoveryPotential = (stage, totalValue) => {
  const recoveryRates = {
    "Prospect": 0.10,
    "Qualified": 0.15,
    "Proposal Sent": 0.25,
    "Negotiation": 0.35,
    "Demo": 0.30,
    "Invoice Sent": 0.45,
    "Closed Lost": 0.20,
    "Lost": 0.20,
    "Unknown": 0.10,
  };

  const rate = recoveryRates[stage] || 0.10;
  return Math.round(totalValue * rate);
};

const getStageRecoveryRate = (stage) => {
  const rates = {
    "Prospect": 10,
    "Qualified": 15,
    "Proposal Sent": 25,
    "Negotiation": 35,
    "Demo": 30,
    "Invoice Sent": 45,
    "Closed Lost": 20,
    "Lost": 20,
    "Unknown": 10,
  };
  return rates[stage] || 10;
};

const calculateRecoveryMetrics = (deals) => {
  const stageAnalysis = calculateStageAnalysis(deals);
  
  const totalRecoveryPotential = stageAnalysis.reduce(
    (sum, stage) => sum + (stage.recoveryPotential || 0), 
    0
  );

  const averageRecoveryRate = stageAnalysis.length > 0
    ? Math.round(stageAnalysis.reduce((sum, stage) => sum + (stage.recoveryRate || 0), 0) / stageAnalysis.length)
    : 0;

  const bestStageForRecovery = stageAnalysis.length > 0
    ? stageAnalysis.reduce((best, stage) => 
        (stage.recoveryRate || 0) > (best?.recoveryRate || 0) ? stage : best
      , stageAnalysis[0])
    : null;

  return {
    totalRecoveryPotential,
    averageRecoveryRate,
    bestStageForRecovery,
  };
};