

import express from "express";
import indexControllers from "../controllers/index.controllers.js";
import { protect, adminOnly,adminOrAssigned, adminCreateOnly} from "../middlewares/auth.middleware.js";
import upload from "../middlewares/upload.js";

const router = express.Router();

router.post("/create", upload.single("profileImage"), protect, adminCreateOnly, indexControllers.usersController.createUser);
router.get("/", protect, adminCreateOnly, indexControllers.usersController.getUsers);
router.put("/update-user/:id", upload.single("profileImage"), protect, adminCreateOnly, indexControllers.usersController.updateUser);
router.delete("/delete-user/:id", protect, adminCreateOnly, indexControllers.usersController.deleteUser);
router.post("/login", indexControllers.usersController.loginUser);
router.put("/update-password", protect, indexControllers.usersController.updatePassword);

router.post("/forgot-password", indexControllers.usersController.forgotPassword);
router.post("/reset-password/:token", indexControllers.usersController.resetPassword);


export default router;