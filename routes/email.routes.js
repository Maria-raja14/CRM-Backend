import express from "express";
import multer from "multer";
import sendBulkEmail, { 
  getEmailHistory, 
  getScheduledEmails, 
  updateScheduledEmail, 
  getSingleEmail, 
  deleteEmail 
} from "../controllers/massEmail.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
});

const router = express.Router();

// POST /api/email/send-bulk
router.post(
  "/send-bulk",
  protect,
  upload.array("attachments"),
  sendBulkEmail
);

// GET /api/email/history
router.get("/history", protect, getEmailHistory);

// GET /api/email/scheduled
router.get("/scheduled", protect, getScheduledEmails);

// IMPORTANT FIX: Use upload.array with the correct field name
router.put(
  "/update/:id", 
  protect, 
  upload.array("newAttachments"), // This was the issue - missing 'upload.'
  updateScheduledEmail
);

// DELETE /api/email/delete/:id
router.delete("/delete/:id", protect, deleteEmail);

// GET /api/email/:id
router.get("/:id", protect, getSingleEmail);

export default router;