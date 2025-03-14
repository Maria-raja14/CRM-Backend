import express from "express";
import userRoutes from "./user.route.js";
import addUser  from "./adduser.routes.js";
import rol


const router = express.Router();

router.use("/users", userRoutes);
router.use("/adduser",addUser);
router.use("/")

export default router;

