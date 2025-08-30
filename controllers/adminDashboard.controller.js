// controllers/dashboardController.js
import Lead from "../models/leads.model.js";
import Deal from "../models/deals.model.js";
import Invoice from "../models/invoice.model.js";

export default {
  getDashboardSummary: async (req, res) => {
    try {
      const totalLeads = await Lead.countDocuments();

      const totalDealsWon = await Deal.countDocuments({ stage: "Closed Won" });

      const totalRevenueAgg = await Deal.aggregate([
        { $match: { stage: "Closed Won" } },
        { $group: { _id: null, total: { $sum: "$value" } } },
      ]);
      const totalRevenue = totalRevenueAgg[0]?.total || 0;

      const pendingInvoices = await Invoice.countDocuments({
        status: "unpaid",
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

  getPipeline : async (req, res) => {
  try {
    const pipeline = await Deal.aggregate([
      { $group: { _id: "$stage", count: { $sum: 1 } } },
      { $project: { stage: "$_id", leads: "$count", _id: 0 } },
    ]);
    res.json(pipeline);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
  
};
