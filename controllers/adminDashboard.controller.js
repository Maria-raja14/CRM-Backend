// controllers/dashboardController.js
import Lead from "../models/leads.model.js";
import Deal from "../models/deals.model.js";
import Invoice from "../models/invoice.model.js";

export default {
  getDashboardSummary: async (req, res) => {
    try {
      const { start, end } = req.query;
      let dateFilter = {};

      if (start || end) {
        dateFilter.createdAt = {};
        if (start) dateFilter.createdAt.$gte = new Date(start);
        if (end) {
          const endDate = new Date(end);
          endDate.setHours(23, 59, 59, 999);
          dateFilter.createdAt.$lte = endDate;
        }
      }

      const totalLeads = await Lead.countDocuments(dateFilter);

      const totalDealsWon = await Deal.countDocuments({
        stage: "Closed Won",
        ...dateFilter,
      });

      const totalRevenueAgg = await Deal.aggregate([
        { $match: { stage: "Closed Won", ...(dateFilter.createdAt && { createdAt: dateFilter.createdAt }) } },
        { $group: { _id: null, total: { $sum: "$value" } } },
      ]);
      const totalRevenue = totalRevenueAgg[0]?.total || 0;

      const pendingInvoices = await Invoice.countDocuments({
        status: "unpaid",
        ...(dateFilter.createdAt && { createdAt: dateFilter.createdAt }),
      });

      res.json({
        totalLeads,
        totalDealsWon,
        totalRevenue,
        pendingInvoices,
      });
    } catch (error) {
      console.error("Dashboard summary error:", error);
      res.status(500).json({ message: "Server Error" });
    }
  },

  getPipeline: async (req, res) => {
    try {
      const { start, end } = req.query;
      let matchFilter = {};

      if (start || end) {
        matchFilter.createdAt = {};
        if (start) matchFilter.createdAt.$gte = new Date(start);
        if (end) {
          const endDate = new Date(end);
          endDate.setHours(23, 59, 59, 999);
          matchFilter.createdAt.$lte = endDate;
        }
      }

      const pipeline = await Deal.aggregate([
        { $match: matchFilter },
        { $group: { _id: "$stage", count: { $sum: 1 } } },
        { $project: { stage: "$_id", leads: "$count", _id: 0 } },
      ]);

      res.json(pipeline);
    } catch (err) {
      console.error("Pipeline error:", err);
      res.status(500).json({ message: err.message });
    }
  },
};
