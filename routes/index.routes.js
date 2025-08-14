import express from "express";
import userRoutes from "./user.route.js";
import leadRoutes from "./leads.routes.js";
// import addUser from "./adduser.routes.js";
import roles from "./role.routes.js";
import invoice from "./invoiceRoutes.js";
import last from "./nameRoutes.js";
import allDealsRoutes from "./allDeals.routes.js";

import activityRoutes from "./activity.routes.js";

import templateRoutes from "./templateRoutes.js";
import proposalRoutes from "./proposalRoutes.js";
import stageRoutes from "./stageRoutes.js";
import meetingRoutes from "./meeting.routes.js";

const router = express.Router();

router.use("/users", userRoutes);
router.use("/leads", leadRoutes);

// router.use("/adduser", addUser);
router.use("/alldeals", allDealsRoutes);

router.use("/roles", roles);
router.use("/activity", activityRoutes);

// router.use("/deals",deals)
router.use("/invoice", invoice);
router.use("/lastname", last);
router.use("/template", templateRoutes);
router.use("/proposal", proposalRoutes);
router.use("/stage", stageRoutes);
router.use("/meeting", meetingRoutes);

export default router;
