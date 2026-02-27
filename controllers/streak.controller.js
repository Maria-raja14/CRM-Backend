import Streak from '../models/streak.model.js';
import User from '../models/user.model.js';
import Deal from '../models/deals.model.js';
import Lead from '../models/leads.model.js';
// Helper function to update user metrics - CORRECTED FORMULA
async function updateUserMetrics(userId) {
  try {
    // ✅ STEP 1: Get TOTAL LEADS from Lead model (DENOMINATOR)
    const totalLeads = await Lead.countDocuments({ 
      assignTo: userId 
      // Count ALL leads assigned to this user - regardless of status
    });
    // ✅ STEP 2: Get QUALIFICATION DEALS from Deal model (NUMERATOR)
    const qualificationDeals = await Deal.countDocuments({
      assignedTo: userId,
      stage: { $regex: new RegExp('^qualification$', 'i') } // Case insensitive
    });
  // ✅ STEP 3: CORRECT CONVERSION RATE FORMULA
    const conversionRate = totalLeads > 0 
      ? (qualificationDeals / totalLeads) * 100 
      : 0;
    return {
      totalLeads,              
      qualificationDeals,    
      conversionRate,          // (qualificationDeals / totalLeads) × 100
      // Keep backward compatibility names
      totalQualificationDeals: qualificationDeals,
      convertedLeadsToQualification: qualificationDeals,
      totalDeals: qualificationDeals,
      leadsConverted: qualificationDeals
    };
  } catch (error) {
    console.error('Error updating user metrics:', error);
    return {
      totalLeads: 0,
      qualificationDeals: 0,
      conversionRate: 0,
      totalQualificationDeals: 0,
      convertedLeadsToQualification: 0,
      totalDeals: 0,
      leadsConverted: 0
    };
  }
}
// ✅ Get user login history from USER MODEL
export const getUserLoginHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUser = req.user;
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }
    const isAdmin = currentUser.role?.name === "Admin" || currentUser.role === "Admin";
    const isOwnData = currentUser._id.toString() === userId;
    if (!isAdmin && !isOwnData) {
      return res.status(403).json({ 
        message: "Access denied: You can only view your own login history" 
      });
    }
    const user = await User.findById(userId).select("firstName lastName email loginHistory");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
   const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    let loginHistory = [];
    if (user.loginHistory && user.loginHistory.length > 0) {
      loginHistory = user.loginHistory
        .filter(log => {
          const loginDate = new Date(log.login);
          return loginDate > thirtyDaysAgo;
        })
        .map(log => ({
          login: log.login,
          logout: log.logout || null,
          date: log.login
        }))
        .sort((a, b) => new Date(b.login) - new Date(a.login));
    }
    const uniqueLoginDays = [...new Set(
      loginHistory.map(log => new Date(log.login).toDateString())
    )].sort((a, b) => new Date(b) - new Date(a));
    const productiveDays = uniqueLoginDays.length;
    let currentStreak = 0;
    const today = new Date().toDateString();
    if (uniqueLoginDays.includes(today)) {
      currentStreak = 1;
      for (let i = 1; i < uniqueLoginDays.length; i++) {
        const prevDay = new Date(uniqueLoginDays[i - 1]);
        const currDay = new Date(uniqueLoginDays[i]);
        const diffTime = prevDay.getTime() - currDay.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }
    let streak = await Streak.findOne({ userId });
    if (!streak) {
      streak = await Streak.create({ 
        userId,
        currentStreak: 0,
        longestStreak: 0,
        productiveDays: 0,
        loginHistory: [],
        performanceMetrics: {
          totalLeads: 0,
          qualificationDeals: 0,
          conversionRate: 0,
          performanceScore: 0,
          status: 'new'
        }
      });
    }
    let longestStreak = streak.longestStreak || 0;
    const allUserLoginDays = [...new Set(
      (user.loginHistory || [])
        .map(log => new Date(log.login).toDateString())
    )].sort((a, b) => new Date(a) - new Date(b));
    let tempStreak = 1;
    let allTimeLongest = 1;
    for (let i = 1; i < allUserLoginDays.length; i++) {
      const prevDay = new Date(allUserLoginDays[i - 1]);
      const currDay = new Date(allUserLoginDays[i]);
      const diffTime = currDay.getTime() - prevDay.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        tempStreak++;
        allTimeLongest = Math.max(allTimeLongest, tempStreak);
      } else {
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, allTimeLongest, currentStreak);
    streak.currentStreak = currentStreak;
    streak.productiveDays = productiveDays;
    streak.longestStreak = longestStreak;
    streak.lastLoginDate = loginHistory[0]?.login || streak.lastLoginDate;
    streak.updatedAt = new Date();
    const last30DaysLogins = loginHistory.map(log => ({
      date: new Date(log.login),
      activity: 'login',
      timestamp: new Date(log.login)
    }));
    streak.loginHistory = last30DaysLogins;
    await streak.save();
    // ✅ Get metrics with CORRECT conversion rate formula
    const metrics = await updateUserMetrics(userId);
    // ✅ PERFORMANCE SCORE = CONVERSION RATE
    const performanceScore = Math.min(
      Math.round(metrics.conversionRate),
      100
    );
    let status = 'new';
    if (metrics.conversionRate >= 70) status = 'star';
    else if (metrics.conversionRate >= 50) status = 'active';
    else if (metrics.conversionRate >= 30) status = 'rising';
    else if (metrics.conversionRate > 0) status = 'new';
    else status = 'inactive';
    streak.performanceMetrics = {
      totalLeads: metrics.totalLeads,
      qualificationDeals: metrics.qualificationDeals,
      conversionRate: metrics.conversionRate,
      performanceScore: Math.round(performanceScore),
      status
    };
    await streak.save();
    res.json({
      success: true,
      userId: user._id,
      userName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      loginHistory,
      streak: {
        current: streak.currentStreak,
        productiveDays: streak.productiveDays,
        totalLogins: loginHistory.length,
        longestStreak: streak.longestStreak,
        lastLoginDate: streak.lastLoginDate
      },
      performance: {
        totalLeads: metrics.totalLeads,
        qualificationDeals: metrics.qualificationDeals,
        conversionRate: metrics.conversionRate,
        conversionDisplay: metrics.totalLeads > 0 ? `${metrics.conversionRate.toFixed(1)}%` : "—",
        conversionRatio: metrics.totalLeads > 0 ? `${metrics.qualificationDeals}/${metrics.totalLeads} leads` : "No leads",
        performanceScore: Math.round(performanceScore),
        status
      },
      lastActive: loginHistory[0]?.login || null
    });
    
  } catch (error) {
    console.error('Error in getUserLoginHistory:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching login history',
      error: error.message 
    });
  }
};
// ✅ Update streak on login
export const updateStreakFromLogin = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select("loginHistory");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    let streak = await Streak.findOne({ userId });
    if (!streak) {
      streak = await Streak.create({ 
        userId,
        currentStreak: 0,
        longestStreak: 0,
        productiveDays: 0,
        loginHistory: []
      });
    }
    const today = new Date();
    const todayString = today.toDateString();
    const lastLoginDate = streak.lastLoginDate ? new Date(streak.lastLoginDate) : null;
    const lastLoginString = lastLoginDate ? lastLoginDate.toDateString() : null;
    if (!lastLoginString || todayString !== lastLoginString) {
      if (lastLoginDate) {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayString = yesterday.toDateString();
        if (lastLoginString === yesterdayString) {
          streak.currentStreak += 1;
          if (streak.currentStreak > streak.longestStreak) {
            streak.longestStreak = streak.currentStreak;
          }
        } else {
          streak.currentStreak = 1;
        }
      } else {
        streak.currentStreak = 1;
      }
      streak.productiveDays += 1;
      streak.lastLoginDate = today;
    }
    streak.loginHistory.push({
      date: today,
      activity: 'login',
      timestamp: new Date()
    });
    if (streak.loginHistory.length > 90) {
      streak.loginHistory = streak.loginHistory.slice(-90);
    }
    await streak.save();
    res.json({ 
      success: true, 
      streak: streak.currentStreak,
      productiveDays: streak.productiveDays,
      longestStreak: streak.longestStreak
    });
  } catch (error) {
    console.error('Error in updateStreakFromLogin:', error);
    res.status(500).json({ error: error.message });
  }
};
// ✅ FIXED: Get leaderboard data - CORRECT CONVERSION RATE FORMULA
export const getLeaderboard = async (req, res) => {
  try {
    const userData = req.user;
    const currentUserId = userData?._id;
    const userRole = userData?.role?.name || userData?.role;
    const isAdminOrSales = userRole === "Admin" || userRole === "Sales";
    let salesUsers = [];
    if (isAdminOrSales) {
      salesUsers = await User.find({
        role: { $in: ['Sales', 'sales', 'Admin', 'admin'] }
      }).populate('role', 'name');
    } else {
      salesUsers = [userData];
    }
    const streakData = await Promise.all(
      salesUsers.map(async (user) => {
        try {
          let streak = await Streak.findOne({ userId: user._id });
          if (!streak) {
            streak = await Streak.create({ userId: user._id });
          }
          // ✅ Get metrics with CORRECT conversion rate formula
          const metrics = await updateUserMetrics(user._id);
          // ✅ PERFORMANCE SCORE = CONVERSION RATE
          const performanceScore = Math.min(
            Math.round(metrics.conversionRate),
            100
          );
          let status = 'new';
          if (metrics.conversionRate >= 70) status = 'star';
          else if (metrics.conversionRate >= 50) status = 'active';
          else if (metrics.conversionRate >= 30) status = 'rising';
          else if (metrics.conversionRate > 0) status = 'new';
          else status = 'inactive';
          return {
            id: user._id,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User',
            email: user.email || '',
            role: user.role?.name || user.role || 'Sales',
            streak: streak.currentStreak || 0,
            productiveDays: streak.productiveDays || 0,
            status,
            // ✅ CORRECT METRICS
            totalLeads: metrics.totalLeads,                    // From Lead model
            qualificationDeals: metrics.qualificationDeals,    // From Deal model - Qualification stage
            conversionRate: metrics.conversionRate,            // (qualificationDeals / totalLeads) × 100
            conversionDisplay: metrics.totalLeads > 0 
              ? `${metrics.conversionRate.toFixed(1)}%` 
              : "—",
            conversionRatio: metrics.totalLeads > 0 
              ? `${metrics.qualificationDeals}/${metrics.totalLeads} leads` 
              : "No leads",
            // ✅ Performance score = conversion rate
            performanceScore,
            // ✅ Keep backward compatibility
            totalQualificationDeals: metrics.qualificationDeals,
            convertedLeadsToQualification: metrics.qualificationDeals,
            totalDeals: metrics.qualificationDeals,
            leadsConverted: metrics.qualificationDeals,
            lastActive: streak.lastLoginDate || user.createdAt || new Date().toISOString(),
            startDate: user.createdAt || new Date().toISOString(),
            isCurrentUser: user._id.toString() === currentUserId.toString(),
            team: user.team || 'General Sales'
          };
        } catch (error) {
          console.error(`Error processing user ${user.email}:`, error);
          return null;
        }
      })
    );
    const validData = streakData.filter(item => item !== null);
    const sortedPerformers = validData.sort((a, b) => b.conversionRate - a.conversionRate);
    const displayData = isAdminOrSales 
      ? sortedPerformers
      : sortedPerformers.filter(p => p.isCurrentUser);
    res.json(displayData);
  } catch (error) {
    console.error('Error in getLeaderboard:', error);
    res.status(500).json({ error: error.message });
  }
};
// Get individual user streak
export const getUserStreak = async (req, res) => {
  try {
    const { userId } = req.params;
    const streak = await Streak.findOne({ userId })
      .populate('userId', 'firstName lastName email role team')
      .lean();
    if (!streak) {
      return res.status(404).json({ message: 'Streak not found' });
    }
    res.json(streak);
  } catch (error) {
    console.error('Error in getUserStreak:', error);
    res.status(500).json({ error: error.message });
  }
};
// Get sales users endpoin
export const getSalesUsers = async (req, res) => {
  try {
    const users = await User.find()
      .populate("role", "name")
      .select("firstName lastName email role team createdAt");
    const salesUsers = users.filter(
      (u) => u.role?.name?.toLowerCase() === "sales"
    );
    res.json({ users: salesUsers });
  } catch (error) {
    console.error("❌ Error fetching sales users:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};