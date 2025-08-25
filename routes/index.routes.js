import express from "express";
import userRoutes from "./user.route.js";
import leadRoutes from "./leads.routes.js";
// import addUser from "./adduser.routes.js";
import roles from "./role.Routes.js";
import invoice from "./invoice.routes.js";
import last from "./nameRoutes.js";

import activityRoutes from "./activity.routes.js";

import templateRoutes from "./templateRoutes.js";
import proposalRoutes from "./proposalRoutes.js";
import stageRoutes from "./stageRoutes.js";
import dealsRoutes from "./deals.route.js";

const router = express.Router();

router.use("/users", userRoutes);
router.use("/leads", leadRoutes);

// router.use("/adduser", addUser);
router.use("/deals", dealsRoutes);

router.use("/roles", roles);
router.use("/activity", activityRoutes);

// router.use("/deals",deals)
router.use("/invoice", invoice);
router.use("/lastname", last);
router.use("/template", templateRoutes);
router.use("/proposal", proposalRoutes);
router.use("/stage", stageRoutes);

export default router;
