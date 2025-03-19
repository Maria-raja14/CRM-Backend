import express from "express";

const router = express.Router();

import indexControllers from "../controllers/index.controllers.js";

router.post("/createrole", indexControllers.roleController.createRole);
router.get("/getrole", indexControllers.roleController.getRoles);
router.get("/rolename", indexControllers.roleController.getUsersByRole);

router.put("/update/:id", indexControllers.roleController.updateRole);
router.delete("delete/:id", indexControllers.roleController.deleteRole);

export default router;
