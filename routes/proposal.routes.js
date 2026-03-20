// import express from "express";
// import indexControllers from "../controllers/index.controllers.js";
// import upload, { normalizePaths } from "../middlewares/upload.js";

// const router = express.Router();

// // ✅ normalizePaths runs after multer to clean up file.path before controller saves to DB
// router.post(
//   "/mailsend",
//   upload.array("attachments", 10),
//   normalizePaths,                          // ← fixes double-slash / backslash paths
//   indexControllers.proposalController.sendProposal
// );
// router.get("/getall", indexControllers.proposalController.getAllProposals);
// router.get("/:id", indexControllers.proposalController.getProposal);
// router.put("/updatestatus/:id", indexControllers.proposalController.updateStatus);
// router.put("/update/:id", indexControllers.proposalController.updateProposal);
// router.delete("/delete/:id", indexControllers.proposalController.deleteProposal);
// router.put("/followup/:id", indexControllers.proposalController.updateFollowUp);

// export default router;//original

import express from "express";
import indexControllers from "../controllers/index.controllers.js";
import upload, { normalizePaths } from "../middlewares/upload.js";

const router = express.Router();

// ── Send / Update proposal  (multipart – handles file attachments) ──
router.post(
  "/mailsend",
  upload.array("attachments", 10),  // up to 10 files, field name "attachments"
  normalizePaths,                    // normalize file.path before controller
  indexControllers.proposalController.sendProposal
);

// ── Read ──────────────────────────────────────────────────────────────
router.get("/getall",  indexControllers.proposalController.getAllProposals);
router.get("/:id",     indexControllers.proposalController.getProposal);

// ── Update ────────────────────────────────────────────────────────────
router.put("/updatestatus/:id", indexControllers.proposalController.updateStatus);
router.put("/update/:id",       indexControllers.proposalController.updateProposal);
//router.put("/followup/:id",     indexControllers.proposalController.updateFollowUp);


router.delete("/deletemany",    indexControllers.proposalController.deleteManyProposals); // ← BULK DELETE (must be before /:id)
// ── Delete ────────────────────────────────────────────────────────────
router.delete("/delete/:id",    indexControllers.proposalController.deleteProposal);

export default router;