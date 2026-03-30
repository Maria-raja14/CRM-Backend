// import express from 'express';
// import {
//   createFacebookLead,
//   getAllFacebookLeads,
//   getFacebookLeadById,
//   updateFacebookLead,
//   deleteFacebookLead,
// } from '../controllers/facebookForm.controller.js';
// import { protect } from '../middlewares/auth.middleware.js'; // if you have auth middleware

// const router = express.Router();

// // All routes are protected (adjust as needed)
// router.post('/create', protect, createFacebookLead);
// router.get('/', protect, getAllFacebookLeads);
// router.get('/:id', protect, getFacebookLeadById);
// router.put('/:id', protect, updateFacebookLead);
// router.delete('/:id', protect, deleteFacebookLead);

// export default router;


import express from "express";
import {
  verifyWebhook,
  receiveWebhook,
  createFacebookLead,
  getAllFacebookLeads
} from "../controllers/facebookForm.controller.js";

const router = express.Router();

// 🔹 Facebook Webhook Verification (GET)
router.get("/webhook", verifyWebhook);

// 🔹 Facebook sends lead data (POST)
router.post("/webhook", receiveWebhook);

// 🔹 Manual create (your React form)
router.post("/create", createFacebookLead);

// 🔹 Get all leads
router.get("/all", getAllFacebookLeads);

export default router;