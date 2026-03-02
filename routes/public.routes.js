import express from "express";
import { submitContactForm } from "../controllers/contactForm.controller.js";
import upload from "../middlewares/upload.js";

const router = express.Router();

// Public contact form submit
router.post("/public/contact-form", upload.array("attachments", 5), submitContactForm);

export default router;
