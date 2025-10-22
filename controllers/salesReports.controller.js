import User from "../models/user.model.js";
import Lead from "../models/leads.model.js";
import Activity from "../models/activity.models.js";
import Invoice from "../models/invoice.model.js"; // make sure you have Invoice model
import mongoose from "mongoose";

// Get performance metrics for a salesperson
export default {
    getSalesPerformance : async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.query;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId))
      return res.status(400).json({ message: "Invalid userId" });

    const user = await User.findById(userId).select(
      "firstName lastName email role loginHistory"
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    
let loginData = [];
if (user.loginHistory?.length > 0) {
  loginData = user.loginHistory.filter((item) => {
    const itemDate = new Date(item.login);
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      return itemDate >= start && itemDate <= end;
    } else if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(startDate);
      end.setHours(23, 59, 59, 999);
      return itemDate >= start && itemDate <= end;
    }
    return true; // no filter
  });
}

    // Leads assigned to this user
    const leadsQuery = {
      assignTo: user._id,
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate && { $gte: new Date(startDate) }),
              ...(endDate && { $lte: new Date(endDate) }),
            },
          }
        : {}),
    };
    const leads = await Lead.find(leadsQuery);

    // Activities assigned to this user
    const activitiesQuery = {
      assignedTo: user._id,
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate && { $gte: new Date(startDate) }),
              ...(endDate && { $lte: new Date(endDate) }),
            },
          }
        : {}),
    };
    const activities = await Activity.find(activitiesQuery);

    // Invoices assigned to this user
    const invoicesQuery = {
      assignedTo: user._id,
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate && { $gte: new Date(startDate) }),
              ...(endDate && { $lte: new Date(endDate) }),
            },
          }
        : {}),
    };
    const invoices = await Invoice.find(invoicesQuery);

    res.status(200).json({
      salesperson: {
        _id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
      },
      loginHistory: loginData,
      metrics: {
        totalLeadsAssigned: leads.length,
        totalActivitiesAssigned: activities.length,
        totalInvoicesAssigned: invoices.length,
      },
      leads,
      activities,
      invoices,
    });
  } catch (err) {
    console.error("❌ Error fetching sales performance:", err);
    res.status(500).json({ message: err.message });
  }
}
}
