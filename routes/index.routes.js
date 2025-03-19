import express from "express";
import userRoutes from "./user.route.js";
import leadGroupRoutes from './leadGroup.routes.js'
import organizationRoutes from "./organization.routes.js";
import personRoutes from './person.routes.js'

const router = express.Router();

router.use("/users", userRoutes);
router.use("/leadGroup", leadGroupRoutes);
router.use("/organization", organizationRoutes);
router.use("/person", personRoutes);

export default router;
