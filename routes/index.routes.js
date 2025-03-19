import express from "express";
import userRoutes from "./user.route.js";
import leadGroupRoutes from './leadGroup.routes.js'
import organizationRoutes from "./organization.routes.js";
import personRoutes from './person.routes.js'
import addUser  from "./adduser.routes.js";
// import roleController from "../controllers/roleController.js";
import roles from "./role.Routes.js"


const router = express.Router();

router.use("/users", userRoutes);
router.use("/leadGroup", leadGroupRoutes);
router.use("/organization", organizationRoutes);
router.use("/person", personRoutes);
router.use("/adduser",addUser);
router.use("/roles",roles)


export default router;

