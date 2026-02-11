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

import gmailRoutes from "./gmailRoutes.js"; // ✅ Add this
import googleAuthRoutes from "./googleAuthRoutes.js"; // Add this



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

router.use("/gmail", gmailRoutes); // ✅ Mount Gmail API routes

router.use("/google-auth", googleAuthRoutes); // Add this line


export default router;
