import express from "express";
import { createOrganization,getAllOrganizations,getOrganizationById,updateOrganization,deleteOrganization,bulkUploadOrganizations } from "../controllers/organization.controller.js";

const router = express.Router();

router.post("/add", createOrganization);
router.get("/", getAllOrganizations);
router.get("/:id", getOrganizationById);
router.put("/:id", updateOrganization);
router.delete("/:id", deleteOrganization);
router.post("/bulk-upload",bulkUploadOrganizations)

export default router;
