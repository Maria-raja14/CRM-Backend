import express from "express";
import userRoutes from "./user.route.js";
import leadGroupRoutes from './leadGroup.routes.js'
import organizationRoutes from "./organization.routes.js";
import personRoutes from './person.routes.js'
import addUser  from "./adduser.routes.js";
import roles from "./role.Routes.js"
import invoice from "./invoiceRoutes.js"
import owners from "./ownerRoutes.js"
import deals from "./dealRoutes.js"
import last from "./nameRoutes.js"
import allDealsRoutes from './allDeals.routes.js'


const router = express.Router();

router.use("/users", userRoutes);
router.use("/leadGroup", leadGroupRoutes);
router.use("/organization", organizationRoutes);
router.use("/person", personRoutes);
router.use("/adduser",addUser);
router.use("/alldeals",allDealsRoutes);
router.use("/roles",roles)
router.use("/owners",owners)
router.use("/deals",deals)
router.use("/invoice",invoice)
router.use("/lastname",last)


export default router;

