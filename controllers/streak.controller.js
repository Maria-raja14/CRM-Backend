// /// import mongoose from "mongoose";
// // import Streak from "../models/streak.model.js";
// // import User from "../models/user.model.js";
// // import Deal from "../models/deals.model.js";
// // import Lead from "../models/leads.model.js";

// // /* ------------------------------------------------------- */
// // /* HELPER : USER METRICS (NO LOGIC CHANGES) */
// // /* ------------------------------------------------------- */

// // async function updateUserMetrics(userId) {
// //   try {
// //     const today = new Date();

// //     const [totalLeads, qualificationDeals] = await Promise.all([
// //       Lead.countDocuments({
// //         assignTo: userId,
// //         createdAt: { $lte: today }
// //       }),

// //       Deal.countDocuments({
// //         assignedTo: userId,
// //         stage: { $regex: /^qualification$/i },
// //         createdAt: { $lte: today }
// //       })
// //     ]);

// //     const conversionRate =
// //       totalLeads > 0
// //         ? Number(((qualificationDeals / totalLeads) * 100).toFixed(2))
// //         : 0;

// //     return {
// //       totalLeads,
// //       qualificationDeals,
// //       conversionRate,
// //       totalQualificationDeals: qualificationDeals,
// //       convertedLeadsToQualification: qualificationDeals,
// //       totalDeals: qualificationDeals,
// //       leadsConverted: qualificationDeals
// //     };
// //   } catch (error) {
// //     console.error("Error updating user metrics:", error);

// //     return {
// //       totalLeads: 0,
// //       qualificationDeals: 0,
// //       conversionRate: 0,
// //       totalQualificationDeals: 0,
// //       convertedLeadsToQualification: 0,
// //       totalDeals: 0,
// //       leadsConverted: 0
// //     };
// //   }
// // }

// // /* ------------------------------------------------------- */
// // /* CONTROLLER */
// // /* ------------------------------------------------------- */

// // export default {

// //   /* ---------------- GET LOGIN HISTORY ---------------- */

// //   async getUserLoginHistory(req, res) {
// //     try {
// //       const { userId } = req.params;
// //       const currentUser = req.user;

// //       if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
// //         return res.status(400).json({
// //           success: false,
// //           message: "Invalid userId"
// //         });
// //       }

// //       if (!currentUser) {
// //         return res.status(401).json({
// //           success: false,
// //           message: "Unauthorized"
// //         });
// //       }

// //       const isAdmin =
// //         currentUser?.role?.name === "Admin" ||
// //         currentUser?.role === "Admin";

// //       const isOwnData =
// //         currentUser?._id?.toString() === userId;

// //       if (!isAdmin && !isOwnData) {
// //         return res.status(403).json({
// //           message: "Access denied"
// //         });
// //       }

// //       const user = await User.findById(userId)
// //         .select("firstName lastName email loginHistory")
// //         .lean();

// //       if (!user) {
// //         return res.status(404).json({ message: "User not found" });
// //       }

// //       const loginHistory = user.loginHistory || [];

// //       res.json({
// //         success: true,
// //         userId: user._id,
// //         loginHistory
// //       });

// //     } catch (error) {
// //       console.error("Error in getUserLoginHistory:", error);
// //       res.status(500).json({
// //         success: false,
// //         message: "Error fetching login history",
// //         error: error.message
// //       });
// //     }
// //   },

// //   /* ---------------- UPDATE STREAK ---------------- */

// //   async updateStreakFromLogin(req, res) {
// //     try {

// //       const { userId } = req.params;

// //       let streak = await Streak.findOne({ userId });

// //       if (!streak) {
// //         streak = await Streak.create({
// //           userId,
// //           currentStreak: 1,
// //           longestStreak: 1,
// //           productiveDays: 1
// //         });
// //       }

// //       res.json({
// //         success: true,
// //         streak
// //       });

// //     } catch (error) {
// //       console.error("Error updating streak:", error);
// //       res.status(500).json({ error: error.message });
// //     }
// //   },

// //   /* ---------------- USER STREAK ---------------- */

// //   async getUserStreak(req, res) {
// //     try {

// //       const { userId } = req.params;

// //       const streak = await Streak.findOne({ userId })
// //         .populate("userId", "firstName lastName email");

// //       if (!streak) {
// //         return res.status(404).json({ message: "Streak not found" });
// //       }

// //       res.json(streak);

// //     } catch (error) {
// //       console.error("Error fetching streak:", error);
// //       res.status(500).json({ error: error.message });
// //     }
// //   },

// //   /* ---------------- LEADERBOARD ---------------- */

// //   async getLeaderboard(req, res) {
// //     try {

// //       const users = await User.find()
// //         .select("firstName lastName email role");

// //       const leaderboard = await Promise.all(
// //         users.map(async (user) => {

// //           const metrics = await updateUserMetrics(user._id);

// //           return {
// //             id: user._id,
// //             name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
// //             email: user.email,
// //             conversionRate: metrics.conversionRate,
// //             totalLeads: metrics.totalLeads,
// //             qualificationDeals: metrics.qualificationDeals
// //           };
// //         })
// //       );

// //       leaderboard.sort((a, b) => b.conversionRate - a.conversionRate);

// //       res.json(leaderboard);

// //     } catch (error) {
// //       console.error("Error in leaderboard:", error);
// //       res.status(500).json({ error: error.message });
// //     }
// //   },

// //   /* ---------------- SALES USERS ---------------- */

// //   async getSalesUsers(req, res) {
// //     try {

// //       const users = await User.find()
// //         .populate("role", "name")
// //         .select("firstName lastName email role");

// //       const salesUsers = users.filter(
// //         (u) => u.role?.name?.toLowerCase() === "sales"
// //       );

// //       res.json({ users: salesUsers });

// //     } catch (error) {
// //       console.error("Error fetching sales users:", error);
// //       res.status(500).json({ error: error.message });
// //     }
// //   }

// // };
// import mongoose from 'mongoose';
// import Streak from '../models/streak.model.js';
// import User from '../models/user.model.js';
// import Deal from '../models/deals.model.js';
// import Lead from '../models/leads.model.js';

// export default {

// // ✅ Get user login history
// getUserLoginHistory: async (req, res) => {
//   try {
//     const { userId } = req.params;
//     const currentUser = req.user;
    
//     if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
//       return res.status(400).json({ success: false, message: 'Invalid or missing userId' });
//     }

//     const isAdmin = currentUser.role?.name === "Admin" || currentUser.role === "Admin";
//     const isOwnData = currentUser._id.toString() === userId;
    
//     if (!isAdmin && !isOwnData) {
//       return res.status(403).json({ message: "Access denied: You can only view your own login history" });
//     }
    
//     const user = await User.findById(userId).select("firstName lastName email loginHistory");
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }
    
//     const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
//     const loginHistory = (user.loginHistory || [])
//       .filter(log => new Date(log.login) > thirtyDaysAgo)
//       .map(log => ({
//         login: log.login,
//         logout: log.logout || null,
//         date: log.login
//       }))
//       .sort((a, b) => new Date(b.login) - new Date(a.login));

//     res.json({ success: true, loginHistory });
//   } catch (error) {
//     console.error('Error in getUserLoginHistory:', error);
//     res.status(500).json({ success: false, message: 'Error fetching login history', error: error.message });
//   }
// },

// // ✅ Update streak on login
// updateStreakFromLogin: async (req, res) => {
//   try {
//     const { userId } = req.params;
//     const user = await User.findById(userId).select("loginHistory");
//     if (!user) return res.status(404).json({ message: "User not found" });

//     let streak = await Streak.findOne({ userId });
//     if (!streak) {
//       streak = await Streak.create({ 
//         userId,
//         currentStreak: 0,
//         longestStreak: 0,
//         productiveDays: 0,
//         loginHistory: []
//       });
//     }

//     const today = new Date();
//     const todayString = today.toDateString();
//     const lastLoginDate = streak.lastLoginDate ? new Date(streak.lastLoginDate) : null;
//     const lastLoginString = lastLoginDate ? lastLoginDate.toDateString() : null;

//     if (!lastLoginString || todayString !== lastLoginString) {
//       if (lastLoginDate) {
//         const yesterday = new Date(today);
//         yesterday.setDate(yesterday.getDate() - 1);
//         const yesterdayString = yesterday.toDateString();
        
//         if (lastLoginString === yesterdayString) {
//           streak.currentStreak += 1;
//           if (streak.currentStreak > streak.longestStreak) streak.longestStreak = streak.currentStreak;
//         } else {
//           streak.currentStreak = 1;
//         }
//       } else {
//         streak.currentStreak = 1;
//       }
//       streak.productiveDays += 1;
//       streak.lastLoginDate = today;
//     }

//     streak.loginHistory.push({ date: today, activity: 'login', timestamp: new Date() });
//     if (streak.loginHistory.length > 90) streak.loginHistory = streak.loginHistory.slice(-90);
    
//     await streak.save();
//     res.json({ success: true, streak: streak.currentStreak, productiveDays: streak.productiveDays, longestStreak: streak.longestStreak });
//   } catch (error) {
//     console.error('Error in updateStreakFromLogin:', error);
//     res.status(500).json({ error: error.message });
//   }
// },

// // ✅ MAIN LEADERBOARD - COMPLETE WITH ALL DATA
// getLeaderboard: async (req, res) => {
//   try {
//     console.log('📊 getLeaderboard started');
    
//     // Check user authentication
//     const userData = req.user;
//     if (!userData) {
//       return res.status(401).json({ success: false, error: 'Unauthorized' });
//     }
    
//     const currentUserId = userData._id.toString();
//     // Handle different role structures
//     const userRole = userData.role?.name || userData.role || '';
//     const isAdmin = userRole === "Admin" || userRole === "admin";
    
//     console.log('User role:', { userRole, isAdmin });
    
//     // Get date parameters
//     const { startDate, endDate } = req.query;
    
//     // Parse dates with fallbacks
//     const rangeStartDate = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
//     const rangeEndDate = endDate ? new Date(endDate) : new Date();
//     rangeStartDate.setHours(0, 0, 0, 0);
//     rangeEndDate.setHours(23, 59, 59, 999);

//     // Get ALL users with role Sales (case insensitive)
//     const allSalesUsers = await User.find({
//       $or: [
//         { role: 'Sales' },
//         { role: 'sales' },
//         { 'role.name': 'Sales' },
//         { 'role.name': 'sales' }
//       ]
//     }).select('_id firstName lastName email role team createdAt').lean();
    
//     console.log(`Found ${allSalesUsers.length} sales users`);

//     // If not admin, filter to only current user
//     let targetUsers = allSalesUsers;
//     if (!isAdmin) {
//       targetUsers = allSalesUsers.filter(u => u._id.toString() === currentUserId);
//     }
    
//     if (targetUsers.length === 0) {
//       return res.json({
//         success: true,
//         data: [],
//         stats: {
//           totalSalespeople: 0,
//           activeSalespeople: 0,
//           avgConversionRate: 0,
//           totalLeads: 0,
//           totalConvertedLeads: 0,
//           cumulativeTotalLeads: 0
//         },
//         dateRange: {
//           start: rangeStartDate,
//           end: rangeEndDate,
//           formatted: `${rangeStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${rangeEndDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
//         }
//       });
//     }

//     const userIds = targetUsers.map(u => u._id);

//     // Get streaks
//     const streaks = await Streak.find({ userId: { $in: userIds } }).lean();
//     const streakMap = new Map();
//     streaks.forEach(s => streakMap.set(s.userId.toString(), s));

//     // Get login history
//     const loginHistories = await User.find({ _id: { $in: userIds } }).select('_id loginHistory').lean();
//     const loginHistoryMap = new Map();
//     loginHistories.forEach(u => loginHistoryMap.set(u._id.toString(), u.loginHistory || []));

//     // Build leaderboard data
//     const leaderboardData = [];
    
//     for (const user of targetUsers) {
//       try {
//         const userId = user._id.toString();
//         const userStreak = streakMap.get(userId) || { 
//           currentStreak: 0, 
//           productiveDays: 0, 
//           longestStreak: 0,
//           lastLoginDate: null 
//         };
//         const userLoginHistory = loginHistoryMap.get(userId) || [];

//         // Get all counts in parallel
//         const [totalLeads, rangeLeads] = await Promise.all([
//           Lead.countDocuments({ assignTo: userId }),
//           Lead.countDocuments({ 
//             assignTo: userId, 
//             createdAt: { $gte: rangeStartDate, $lte: rangeEndDate } 
//           })
//         ]);

//         const [totalQualificationDeals, rangeQualificationDeals] = await Promise.all([
//           Deal.countDocuments({ 
//             assignedTo: userId, 
//             stage: { $regex: /^qualification$/i } 
//           }),
//           Deal.countDocuments({ 
//             assignedTo: userId, 
//             stage: { $regex: /^qualification$/i }, 
//             createdAt: { $gte: rangeStartDate, $lte: rangeEndDate } 
//           })
//         ]);

//         const [totalConvertedLeads, rangeConvertedLeads] = await Promise.all([
//           Deal.countDocuments({ 
//             assignedTo: userId, 
//             stage: { $regex: /^qualification$/i }, 
//             leadId: { $exists: true, $ne: null } 
//           }),
//           Deal.countDocuments({ 
//             assignedTo: userId, 
//             stage: { $regex: /^qualification$/i }, 
//             leadId: { $exists: true, $ne: null }, 
//             createdAt: { $gte: rangeStartDate, $lte: rangeEndDate } 
//           })
//         ]);

//         // Calculate metrics
//         const rangeTotalLeads = rangeLeads + rangeQualificationDeals;
//         const rangeConversionRate = rangeTotalLeads > 0 ? (rangeConvertedLeads / rangeTotalLeads) * 100 : 0;
        
//         const cumulativeTotalLeads = totalLeads + totalQualificationDeals;
//         const cumulativeConversionRate = cumulativeTotalLeads > 0 ? (totalConvertedLeads / cumulativeTotalLeads) * 100 : 0;

//         // Calculate productive days in range
//         const rangeLogins = userLoginHistory.filter(log => {
//           if (!log?.login) return false;
//           const loginDate = new Date(log.login);
//           return loginDate >= rangeStartDate && loginDate <= rangeEndDate;
//         });

//         const uniqueLoginDays = new Set();
//         rangeLogins.forEach(log => {
//           if (log.login) uniqueLoginDays.add(new Date(log.login).toDateString());
//         });
        
//         const productiveDays = uniqueLoginDays.size;

//         // Calculate current streak
//         let currentStreak = 0;
//         if (userLoginHistory.length > 0) {
//           const sortedLogins = userLoginHistory
//             .filter(log => log?.login)
//             .map(log => new Date(log.login))
//             .sort((a, b) => b - a);

//           const today = new Date();
//           today.setHours(0, 0, 0, 0);
//           const yesterday = new Date(today);
//           yesterday.setDate(yesterday.getDate() - 1);
//           const lastLogin = sortedLogins[0];

//           if (lastLogin) {
//             lastLogin.setHours(0, 0, 0, 0);
//             if (lastLogin.getTime() === today.getTime() || lastLogin.getTime() === yesterday.getTime()) {
//               currentStreak = 1;
//               const uniqueDates = [...new Set(sortedLogins.map(d => d.toDateString()))];
//               for (let i = 1; i < uniqueDates.length; i++) {
//                 const currDate = new Date(uniqueDates[i-1]);
//                 const prevDate = new Date(uniqueDates[i]);
//                 currDate.setHours(0, 0, 0, 0);
//                 prevDate.setHours(0, 0, 0, 0);
//                 const diffDays = Math.round((currDate - prevDate) / (1000 * 60 * 60 * 24));
//                 if (diffDays === 1) currentStreak++;
//                 else break;
//               }
//             }
//           }
//         }

//         // Format work hours for today
//         const today = new Date().toDateString();
//         const todayLogin = userLoginHistory.find(log => 
//           log?.login && new Date(log.login).toDateString() === today
//         );
        
//         let workHours = '—';
//         if (todayLogin) {
//           const loginTime = new Date(todayLogin.login).toLocaleTimeString('en-US', { 
//             hour: '2-digit', 
//             minute: '2-digit', 
//             hour12: true 
//           });
//           if (todayLogin.logout) {
//             const logoutTime = new Date(todayLogin.logout).toLocaleTimeString('en-US', { 
//               hour: '2-digit', 
//               minute: '2-digit', 
//               hour12: true 
//             });
//             workHours = `${loginTime} - ${logoutTime}`;
//           } else {
//             workHours = `${loginTime} - Ongoing`;
//           }
//         }

//         // Determine status based on conversion rate
//         let status = 'inactive';
//         let statusIcon = '💤';
//         let statusColor = 'bg-gray-100 text-gray-500 border-gray-200';
        
//         if (rangeConversionRate >= 70) {
//           status = 'star';
//           statusIcon = '⭐';
//           statusColor = 'bg-yellow-100 text-yellow-800 border-yellow-200';
//         } else if (rangeConversionRate >= 50) {
//           status = 'active';
//           statusIcon = '🔥';
//           statusColor = 'bg-green-100 text-green-800 border-green-200';
//         } else if (rangeConversionRate >= 30) {
//           status = 'rising';
//           statusIcon = '🚀';
//           statusColor = 'bg-blue-100 text-blue-800 border-blue-200';
//         } else if (rangeConversionRate > 0) {
//           status = 'new';
//           statusIcon = '🆕';
//           statusColor = 'bg-gray-100 text-gray-800 border-gray-200';
//         }

//         // FIXED: Better name handling
//         let displayName = 'Unknown User';
//         if (user.firstName || user.lastName) {
//           displayName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
//         } else if (user.email) {
//           displayName = user.email.split('@')[0]; // Use part before @ in email
//         }

//         // Add to leaderboard with ALL fields
//         leaderboardData.push({
//           id: userId,
//           name: displayName,
//           email: user.email || '',
//           role: user.role?.name || user.role || 'Sales',
//           team: user.team || 'General Sales',
          
//           // Range metrics (for current date range)
//           totalLeads: rangeTotalLeads,
//           qualificationDeals: rangeQualificationDeals,
//           convertedLeads: rangeConvertedLeads,
//           conversionRate: Number(rangeConversionRate.toFixed(1)),
//           conversionDisplay: `${rangeConversionRate.toFixed(1)}%`,
          
//           // Cumulative metrics (all time)
//           cumulativeTotalLeads: cumulativeTotalLeads,
//           cumulativeConvertedLeads: totalConvertedLeads,
//           cumulativeConversionRate: Number(cumulativeConversionRate.toFixed(1)),
//           cumulativeDisplay: `${cumulativeConversionRate.toFixed(1)}%`,
          
//           // Streak metrics
//           streak: currentStreak,
//           productiveDays: productiveDays,
//           longestStreak: userStreak.longestStreak || 0,
//           workHours: workHours,
          
//           // Status and styling
//           status: status,
//           statusIcon: statusIcon,
//           statusColor: statusColor,
//           performanceScore: Math.min(Math.round(rangeConversionRate), 100),
          
//           // User flags
//           isCurrentUser: userId === currentUserId,
//           lastActive: userStreak.lastLoginDate || user.createdAt || new Date().toISOString(),
//           startDate: user.createdAt
//         });

//       } catch (userError) {
//         console.error(`Error processing user ${user.email}:`, userError);
//         // Continue with next user
//       }
//     }

//     console.log(`Generated data for ${leaderboardData.length} users`);

//     // Sort by converted leads first, then conversion rate
//     const sortedData = leaderboardData.sort((a, b) => {
//       if (b.convertedLeads !== a.convertedLeads) {
//         return b.convertedLeads - a.convertedLeads;
//       }
//       return b.conversionRate - a.conversionRate;
//     });

//     // Calculate stats
//     const stats = {
//       totalSalespeople: sortedData.length,
//       activeSalespeople: sortedData.filter(p => p.conversionRate > 0).length,
//       avgConversionRate: sortedData.length > 0 
//         ? Number((sortedData.reduce((acc, p) => acc + p.conversionRate, 0) / sortedData.length).toFixed(1))
//         : 0,
//       totalLeads: sortedData.reduce((acc, p) => acc + p.totalLeads, 0),
//       totalConvertedLeads: sortedData.reduce((acc, p) => acc + p.convertedLeads, 0),
//       cumulativeTotalLeads: sortedData.reduce((acc, p) => acc + p.cumulativeTotalLeads, 0),
//     };

//     // Send response with ALL data
//     res.json({
//       success: true,
//       data: sortedData,
//       stats: stats,
//       dateRange: {
//         start: rangeStartDate,
//         end: rangeEndDate,
//         formatted: `${rangeStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${rangeEndDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
//       },
//       userRole: isAdmin ? 'admin' : 'sales'
//     });

//   } catch (error) {
//     console.error('Fatal error in getLeaderboard:', error);
//     res.status(500).json({ 
//       success: false, 
//       error: error.message 
//     });
//   }
// },

// // Get individual user streak
// getUserStreak: async (req, res) => {
//   try {
//     const { userId } = req.params;
//     const streak = await Streak.findOne({ userId })
//       .populate('userId', 'firstName lastName email role team')
//       .lean();
//     if (!streak) return res.status(404).json({ message: 'Streak not found' });
//     res.json(streak);
//   } catch (error) {
//     console.error('Error in getUserStreak:', error);
//     res.status(500).json({ error: error.message });
//   }
// },

// // Get sales users
// getSalesUsers: async (req, res) => {
//   try {
//     const users = await User.find()
//       .populate("role", "name")
//       .select("firstName lastName email role team createdAt");
//     const salesUsers = users.filter(u => u.role?.name?.toLowerCase() === "sales");
//     res.json({ success: true, users: salesUsers });
//   } catch (error) {
//     console.error("Error fetching sales users:", error);
//     res.status(500).json({ success: false, message: "Server error", error: error.message });
//   }
// }

// };
import mongoose from 'mongoose';
import Streak from '../models/streak.model.js';
import User from '../models/user.model.js';
import Deal from '../models/deals.model.js';
import Lead from '../models/leads.model.js';
import Role from '../models/role.model.js'; // adjust path if needed

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function calcStreak(loginHistory) {
  if (!loginHistory?.length) return 0;

  const uniqueDates = [
    ...new Set(
      loginHistory
        .filter(l => l?.login)
        .map(l => new Date(l.login).toDateString())
    )
  ].map(d => new Date(d)).sort((a, b) => b - a);

  if (!uniqueDates.length) return 0;

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const latest = new Date(uniqueDates[0]); latest.setHours(0, 0, 0, 0);

  if (latest.getTime() !== today.getTime() && latest.getTime() !== yesterday.getTime()) return 0;

  let streak = 1;
  for (let i = 1; i < uniqueDates.length; i++) {
    const curr = new Date(uniqueDates[i - 1]); curr.setHours(0, 0, 0, 0);
    const prev = new Date(uniqueDates[i]);      prev.setHours(0, 0, 0, 0);
    if (Math.round((curr - prev) / 86400000) === 1) streak++;
    else break;
  }
  return streak;
}

function formatTime(date) {
  if (!date) return null;
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: true
  });
}

function calcWorkHours(loginHistory) {
  const todayStr = new Date().toDateString();
  const todayLogs = (loginHistory || []).filter(l =>
    l?.login && new Date(l.login).toDateString() === todayStr
  );
  if (!todayLogs.length) return '—';

  const earliest = todayLogs.reduce((e, l) =>
    new Date(l.login) < new Date(e.login) ? l : e
  );
  const logouts = todayLogs.filter(l => l.logout);
  if (!logouts.length) return `${formatTime(earliest.login)} - Ongoing`;

  const latest = logouts.reduce((e, l) =>
    new Date(l.logout) > new Date(e.logout) ? l : e
  );
  return `${formatTime(earliest.login)} - ${formatTime(latest.logout)}`;
}

function getStatus(rate) {
  if (rate >= 70) return { status: 'star',     statusIcon: '⭐', statusColor: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
  if (rate >= 50) return { status: 'active',   statusIcon: '🔥', statusColor: 'bg-green-100 text-green-800 border-green-200' };
  if (rate >= 30) return { status: 'rising',   statusIcon: '🚀', statusColor: 'bg-blue-100 text-blue-800 border-blue-200' };
  if (rate >  0)  return { status: 'new',      statusIcon: '🆕', statusColor: 'bg-gray-100 text-gray-800 border-gray-200' };
  return               { status: 'inactive', statusIcon: '💤', statusColor: 'bg-gray-100 text-gray-500 border-gray-200' };
}

// ─── CONTROLLER ───────────────────────────────────────────────────────────────

export default {

  // ── GET LOGIN HISTORY ────────────────────────────────────────────────────────
  getUserLoginHistory: async (req, res) => {
    try {
      const { userId } = req.params;
      const currentUser = req.user;

      if (!userId || !mongoose.Types.ObjectId.isValid(userId))
        return res.status(400).json({ success: false, message: 'Invalid userId' });

      const isAdmin = currentUser.role?.name === 'Admin' || currentUser.role === 'Admin';
      const isOwnData = currentUser._id.toString() === userId;

      if (!isAdmin && !isOwnData)
        return res.status(403).json({ message: 'Access denied' });

      const user = await User.findById(userId)
        .select('firstName lastName email loginHistory')
        .lean();

      if (!user) return res.status(404).json({ message: 'User not found' });

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const loginHistory = (user.loginHistory || [])
        .filter(l => new Date(l.login) > thirtyDaysAgo)
        .sort((a, b) => new Date(b.login) - new Date(a.login));

      res.json({ success: true, loginHistory });
    } catch (error) {
      console.error('getUserLoginHistory error:', error);
      res.status(500).json({ success: false, message: 'Error fetching login history', error: error.message });
    }
  },

  // ── UPDATE STREAK ON LOGIN ───────────────────────────────────────────────────
  updateStreakFromLogin: async (req, res) => {
    try {
      const { userId } = req.params;

      let streak = await Streak.findOne({ userId });
      if (!streak) {
        streak = await Streak.create({ userId, currentStreak: 0, longestStreak: 0, productiveDays: 0 });
      }

      const today = new Date();
      const todayStr = today.toDateString();
      const lastStr = streak.lastLoginDate ? new Date(streak.lastLoginDate).toDateString() : null;

      if (lastStr !== todayStr) {
        const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
        if (lastStr === yesterday.toDateString()) {
          streak.currentStreak = (streak.currentStreak || 0) + 1;
        } else {
          streak.currentStreak = 1;
        }
        if (streak.currentStreak > (streak.longestStreak || 0)) streak.longestStreak = streak.currentStreak;
        streak.productiveDays = (streak.productiveDays || 0) + 1;
        streak.lastLoginDate = today;
        await streak.save();
      }

      res.json({
        success: true,
        streak: streak.currentStreak,
        productiveDays: streak.productiveDays,
        longestStreak: streak.longestStreak
      });
    } catch (error) {
      console.error('updateStreakFromLogin error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // ── MAIN LEADERBOARD ─────────────────────────────────────────────────────────
  getLeaderboard: async (req, res) => {
    try {
      console.log('📊 getLeaderboard started');

      const currentUser = req.user;
      if (!currentUser) return res.status(401).json({ success: false, error: 'Unauthorized' });

      const currentUserId = currentUser._id.toString();

      // ── Resolve role ──
      // Handles: role = 'Admin' (string), role = { name: 'Admin' } (populated), role = ObjectId
      let userRoleName = '';
      if (typeof currentUser.role === 'string') {
        userRoleName = currentUser.role;
      } else if (currentUser.role?.name) {
        userRoleName = currentUser.role.name;
      } else if (mongoose.Types.ObjectId.isValid(currentUser.role)) {
        // role is stored as ObjectId — look it up
        try {
          const roleDoc = await Role.findById(currentUser.role).lean();
          userRoleName = roleDoc?.name || '';
        } catch (_) {
          userRoleName = '';
        }
      }

      const isAdmin = ['Admin', 'admin'].includes(userRoleName);
      console.log(`👤 User: ${currentUserId} | Role: "${userRoleName}" | isAdmin: ${isAdmin}`);

      // ── Date range ──
      const today = new Date();
      const rangeStart = req.query.startDate
        ? new Date(req.query.startDate)
        : new Date(today.getFullYear(), today.getMonth(), 1);
      const rangeEnd = req.query.endDate
        ? new Date(req.query.endDate)
        : new Date(today);
      rangeStart.setHours(0, 0, 0, 0);
      rangeEnd.setHours(23, 59, 59, 999);

      console.log(`📅 Range: ${rangeStart.toISOString()} → ${rangeEnd.toISOString()}`);

      // ── Fetch ALL users then filter by role in JS ──
      // This avoids any schema-mismatch issues with $or on role fields
      const allUsers = await User.find({})
        .select('_id firstName lastName email role loginHistory createdAt')
        .populate('role', 'name')   // safe even if role is a string — mongoose ignores it
        .lean();

      console.log(`👥 Total users in DB: ${allUsers.length}`);

      // Filter to only Sales users
      const salesUsers = allUsers.filter(u => {
        const rn = u.role?.name || u.role || '';
        return typeof rn === 'string' && rn.toLowerCase() === 'sales';
      });

      console.log(`🧑‍💼 Sales users found: ${salesUsers.length}`);

      // Non-admins only see themselves (and only if they are a sales user)
      let targetUsers = isAdmin
        ? salesUsers
        : salesUsers.filter(u => u._id.toString() === currentUserId);

      // Edge case: admin is checking their own data even though they're not "Sales"
      // If non-admin and targetUsers is empty, check if the current user exists at all
      if (!isAdmin && targetUsers.length === 0) {
        console.log(`⚠️  Current user not found in sales list — returning empty`);
        return res.json({
          success: true,
          data: [],
          stats: { totalSalespeople: 0, activeSalespeople: 0, avgConversionRate: 0, totalLeads: 0, totalConvertedLeads: 0, cumulativeTotalLeads: 0 },
          dateRange: {
            start: rangeStart,
            end: rangeEnd,
            formatted: `${rangeStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${rangeEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
          },
          userRole: 'sales'
        });
      }

      const userIds = targetUsers.map(u => u._id);
      console.log(`🎯 Processing ${targetUsers.length} users`);

      // ── Bulk fetch leads & deals (2 queries total, no N+1) ──
      const [allLeads, allDeals] = await Promise.all([
        Lead.find({ assignTo: { $in: userIds } })
          .select('_id assignTo createdAt')
          .lean(),
        Deal.find({
          assignedTo: { $in: userIds },
          stage: { $regex: /^qualification$/i }
        })
          .select('_id assignedTo leadId createdAt stage')
          .lean()
      ]);

      console.log(`📋 Leads: ${allLeads.length} | Deals (qualification): ${allDeals.length}`);

      // ── Index leads & deals by userId ──
      const leadsMap = {};
      const dealsMap = {};

      targetUsers.forEach(u => {
        const id = u._id.toString();
        leadsMap[id] = { range: 0, cumulative: 0 };
        dealsMap[id] = { rangeQ: 0, rangeC: 0, cumQ: 0, cumC: 0 };
      });

      allLeads.forEach(lead => {
        const id = lead.assignTo?.toString();
        if (!leadsMap[id]) return;
        leadsMap[id].cumulative++;
        const d = new Date(lead.createdAt);
        if (d >= rangeStart && d <= rangeEnd) leadsMap[id].range++;
      });

      allDeals.forEach(deal => {
        const id = deal.assignedTo?.toString();
        if (!dealsMap[id]) return;
        const hasLead = !!deal.leadId;
        dealsMap[id].cumQ++;
        if (hasLead) dealsMap[id].cumC++;
        const d = new Date(deal.createdAt);
        if (d >= rangeStart && d <= rangeEnd) {
          dealsMap[id].rangeQ++;
          if (hasLead) dealsMap[id].rangeC++;
        }
      });

      // ── Build leaderboard rows ──
      const rows = targetUsers.map(user => {
        const id = user._id.toString();
        const lm = leadsMap[id];
        const dm = dealsMap[id];
        const loginHistory = user.loginHistory || [];

        // Range metrics
        const rangeTotalLeads = lm.range + dm.rangeQ;
        const rangeConvRate   = rangeTotalLeads > 0 ? (dm.rangeC / rangeTotalLeads) * 100 : 0;

        // Cumulative metrics
        const cumTotalLeads   = lm.cumulative + dm.cumQ;
        const cumConvRate     = cumTotalLeads  > 0 ? (dm.cumC  / cumTotalLeads)  * 100 : 0;

        // Productive days in range
        const rangeLoginDays = new Set(
          loginHistory
            .filter(l => {
              if (!l?.login) return false;
              const d = new Date(l.login);
              return d >= rangeStart && d <= rangeEnd;
            })
            .map(l => new Date(l.login).toDateString())
        );

        const streak    = calcStreak(loginHistory);
        const workHours = calcWorkHours(loginHistory);
        const { status, statusIcon, statusColor } = getStatus(rangeConvRate);

        const displayName =
          (user.firstName || user.lastName)
            ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
            : user.email?.split('@')[0] || 'Unknown';

        return {
          id,
          name:  displayName,
          email: user.email || '',
          role:  user.role?.name || user.role || 'Sales',
          team:  user.team || 'General Sales',
          avatar: (user.firstName?.charAt(0) || 'U').toUpperCase(),

          // Range
          totalLeads:         rangeTotalLeads,
          rawLeads:           lm.range,
          qualificationDeals: dm.rangeQ,
          convertedLeads:     dm.rangeC,
          conversionRate:     Number(rangeConvRate.toFixed(1)),
          conversionDisplay:  `${rangeConvRate.toFixed(1)}%`,

          // Cumulative
          cumulativeTotalLeads:     cumTotalLeads,
          cumulativeConvertedLeads: dm.cumC,
          cumulativeConversionRate: Number(cumConvRate.toFixed(1)),
          cumulativeDisplay:        `${cumConvRate.toFixed(1)}%`,

          // Activity
          streak,
          productiveDays: rangeLoginDays.size,
          workHours,

          // Status
          status, statusIcon, statusColor,
          performanceScore: Math.min(Math.round(rangeConvRate), 100),
          isCurrentUser: id === currentUserId
        };
      });

      // ── Filter zero-activity, sort ──
      const sorted = rows
        .filter(r => r.totalLeads > 0 || r.cumulativeTotalLeads > 0)
        .sort((a, b) =>
          b.convertedLeads !== a.convertedLeads
            ? b.convertedLeads - a.convertedLeads
            : b.conversionRate - a.conversionRate
        );

      console.log(`✅ Leaderboard built: ${sorted.length} rows`);

      // ── Aggregate stats ──
      const stats = {
        totalSalespeople:    sorted.length,
        activeSalespeople:   sorted.filter(r => r.conversionRate > 0).length,
        avgConversionRate:   sorted.length
          ? Number((sorted.reduce((s, r) => s + r.conversionRate, 0) / sorted.length).toFixed(1))
          : 0,
        totalLeads:           sorted.reduce((s, r) => s + r.totalLeads, 0),
        totalConvertedLeads:  sorted.reduce((s, r) => s + r.convertedLeads, 0),
        cumulativeTotalLeads: sorted.reduce((s, r) => s + r.cumulativeTotalLeads, 0)
      };

      res.json({
        success: true,
        data: sorted,
        stats,
        dateRange: {
          start: rangeStart,
          end:   rangeEnd,
          formatted: `${rangeStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${rangeEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
        },
        userRole: isAdmin ? 'admin' : 'sales'
      });

    } catch (error) {
      // Detailed error log so you can see exactly what crashed
      console.error('❌ getLeaderboard FATAL ERROR:');
      console.error('  message:', error.message);
      console.error('  stack:', error.stack);
      res.status(500).json({ success: false, error: error.message, stack: error.stack });
    }
  },

  // ── GET USER STREAK ──────────────────────────────────────────────────────────
  getUserStreak: async (req, res) => {
    try {
      const streak = await Streak.findOne({ userId: req.params.userId })
        .populate('userId', 'firstName lastName email role team')
        .lean();
      if (!streak) return res.status(404).json({ message: 'Streak not found' });
      res.json(streak);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // ── GET SALES USERS ──────────────────────────────────────────────────────────
  getSalesUsers: async (req, res) => {
    try {
      const users = await User.find()
        .populate('role', 'name')
        .select('firstName lastName email role team createdAt');
      const salesUsers = users.filter(u => u.role?.name?.toLowerCase() === 'sales');
      res.json({ success: true, users: salesUsers });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};