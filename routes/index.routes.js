import express from "express";
import userRoutes from "./user.route.js";
import leadRoutes from "./leads.routes.js";
import roles from "./role.Routes.js";
import invoice from "./invoice.routes.js";

import activityRoutes from "./activity.routes.js";
import proposalRoutes from "./proposal.routes.js";
import dealsRoutes from "./deals.route.js";
import adminDashboard from "./adminDashboard.routes.js";
import notificationRoutes from "./notification.routes.js";
import salesRoutes from "./salesReports.routes.js"
import aiRoutes from "./ai.routes.js"; // ✅ ADD THIS LINE
import streakRoutes from "./streak.routes.js"; // ✅ ADD THIS LINE
import callLogRoutes from "./callLog.routes.js";
import botRoutes from "./bot.routes.js";
const router = express.Router();

router.use("/users", userRoutes);
router.use("/leads", leadRoutes);

router.use("/deals", dealsRoutes);

router.use("/roles", roles);
router.use("/activity", activityRoutes);

router.use("/invoice", invoice);

router.use("/proposal", proposalRoutes);
router.use("/dashboard", adminDashboard);
router.use("/notification", notificationRoutes);
router.use("/sales", salesRoutes);
router.use("/ai", aiRoutes); // ✅ ADD THIS LINE
router.use("/streak", streakRoutes); // ✅ ADD THIS LINE
router.use("/calllogs", callLogRoutes);
router.use("/bot", botRoutes);


export default router;
