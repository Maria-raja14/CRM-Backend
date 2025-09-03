import express from "express";
import indexControllers from "../controllers/index.controllers.js";
import upload from "../middlewares/upload.js";

const router = express.Router();

router.post("/mailsend",upload.array("attachments", 10),indexControllers.proposalController.sendProposal);
router.get("/getall", indexControllers.proposalController.getAllProposals);
router.get("/:id", indexControllers.proposalController.getProposal);
router.put("/updatestatus/:id",indexControllers.proposalController.updateStatus);
router.put("/update/:id", indexControllers.proposalController.updateProposal);
router.delete("/delete/:id",indexControllers.proposalController.deleteProposal);
router.put("/followup/:id", indexControllers.proposalController.updateFollowUp);


export default router;
