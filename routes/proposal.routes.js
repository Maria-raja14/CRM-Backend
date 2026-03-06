import express from "express";
import indexControllers from "../controllers/index.controllers.js";
import upload, { normalizePaths } from "../middlewares/upload.js";

const router = express.Router();

// ✅ normalizePaths runs after multer to clean up file.path before controller saves to DB
router.post(
  "/mailsend",
  upload.array("attachments", 10),
  normalizePaths,                          // ← fixes double-slash / backslash paths
  indexControllers.proposalController.sendProposal
);
router.get("/getall", indexControllers.proposalController.getAllProposals);
router.get("/:id", indexControllers.proposalController.getProposal);
router.put("/updatestatus/:id", indexControllers.proposalController.updateStatus);
router.put("/update/:id", indexControllers.proposalController.updateProposal);
router.delete("/delete/:id", indexControllers.proposalController.deleteProposal);
router.put("/followup/:id", indexControllers.proposalController.updateFollowUp);

export default router;//original

