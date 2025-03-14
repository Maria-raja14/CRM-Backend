const express = require("express");
const router = express.Router();
const roleController = require("../controllers/roleController");
const { default: indexControllers } = require("../controllers/index.controllers");

router.post("/", indexControllers.roleController.createRole);
router.get("/", indexControllers. roleController.getRoles);
router.put("/:id",indexControllers. roleController.updateRole);
router.delete("/:id",indexControllers. roleController.deleteRole);

module.exports = router;
