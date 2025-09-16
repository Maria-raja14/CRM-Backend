

import express from "express";
import indexControllers from "../controllers/index.controllers.js";
import { protect, adminOnly ,adminCreateOnly} from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post(
  "/",
  protect,
  adminCreateOnly,
  indexControllers.roleController.createRole
);
router.get("/",  indexControllers.roleController.getRoles);

router.put("/update-role/:id", protect, adminCreateOnly, indexControllers.roleController.updateRole);
router.delete("/delete-role/:id", protect, adminCreateOnly, indexControllers.roleController.deleteRole);

router.put(
  "/:id",
  protect,
  adminCreateOnly,
  indexControllers.roleController.updateRole
);
router.delete(
  "/:id",
  protect,
  adminCreateOnly,
  indexControllers.roleController.deleteRole
);


export default router;



