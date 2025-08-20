

import express from "express";
import indexControllers from "../controllers/index.controllers.js";
import { protect, adminOnly } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post(
  "/",
  protect,
  adminOnly,
  indexControllers.roleController.createRole
);
router.get("/", protect, indexControllers.roleController.getRoles);

router.put("/update-role/:id", protect, adminOnly, indexControllers.roleController.updateRole);
router.delete("/delete-role/:id", protect, adminOnly, indexControllers.roleController.deleteRole);

router.put(
  "/:id",
  protect,
  adminOnly,
  indexControllers.roleController.updateRole
);
router.delete(
  "/:id",
  protect,
  adminOnly,
  indexControllers.roleController.deleteRole
);


export default router;



