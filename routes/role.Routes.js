

import express from "express";
import indexControllers from "../controllers/index.controllers.js";
import { protect,adminOnly  } from "../middlewares/auth.middleware.js"

const router = express.Router();


router.post("/", protect, adminOnly, indexControllers.roleController.createRole);
router.get("/", protect, indexControllers.roleController.getRoles);

export default router;
