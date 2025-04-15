// const express = require("express");
import express from "express";
// const { createProposal, sendProposal, getAllProposals } = require("../controllers/proposalController");
import indexControllers from "../controllers/index.controllers.js";
// const multer = require("multer");
import multer from "multer";

const router = express.Router();

// Multer for file uploads
const storage = multer.diskStorage({
  destination: "./uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// API Routes
router.post("/create", indexControllers.proposalController.createProposal);
router.post("/mailsend", indexControllers.proposalController.sendProposal);
router.get("/getall", indexControllers.proposalController.getAllProposals);
router.put(
  "/proposal/updatestatus/:id",
  indexControllers.proposalController.updateStatus
);
router.put(
  "/proposal/updatepro/:id",
  indexControllers.proposalController.updateProposal
);
router.delete(
  "/proposal/delete/:id",
  indexControllers.proposalController.deleteProposal
);
router.put(
  "/proposal/updateproposal/:id",
  indexControllers.proposalController.updateProposalStage
);

router.post("/upload-image", upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  res.json({ imageUrl: `/uploads/${req.file.filename}` });
});

export default router;
