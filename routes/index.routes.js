import express from "express";
import userRoutes from "./user.route.js";
import addUser  from "./adduser.routes.js";
// import roleController from "../controllers/roleController.js";
import roles from "./role.Routes.js"
import invoice from "./invoiceRoutes.js"
import owners from "./ownerRoutes.js"
import deals from "./dealRoutes.js"
import last from "./nameRoutes.js"


const router = express.Router();

router.use("/users", userRoutes);
router.use("/adduser",addUser);
router.use("/roles",roles)
router.use("/owners",owners)
router.use("/deals",deals)
router.use("/invoice",invoice)
router.use("/lastname",last)


export default router;

