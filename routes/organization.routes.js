import express from "express";
import indexControllers from "../controllers/index.controllers.js";
const router = express.Router();

router.post("/add",  indexControllers.OrganizationController.createOrganization);
router.get("/", indexControllers.OrganizationController.getAllOrganizations);
router.get("/:id", indexControllers.OrganizationController.getOrganizationById);
router.put("/:id", indexControllers.OrganizationController.updateOrganization);
router.delete("/:id", indexControllers.OrganizationController.deleteOrganization);
router.post("/bulk-upload",indexControllers.OrganizationController.bulkUploadOrganizations);

export default router;
