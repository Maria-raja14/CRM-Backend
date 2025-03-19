import express from "express";
import userRoutes from "./user.route.js";
import addUser  from "./adduser.routes.js";
// import roleController from "../controllers/roleController.js";
import roles from "./role.Routes.js"


const router = express.Router();

router.use("/users", userRoutes);
router.use("/adduser",addUser);
router.use("/roles",roles)


export default router;

