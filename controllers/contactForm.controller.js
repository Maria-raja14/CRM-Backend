import axios from "axios";
import ContactForm from "../models/ContactForm.js";
import { sendContactFormNotification } from "../services/contactNotification.service.js";


export const submitContactForm = async (req, res) => {
  console.log("📦 CONTACT FORM REQ BODY:", req.body);
  try {
    const { captchaToken } = req.body;

    if (!captchaToken) {
      return res.status(400).json({
        success: false,
        message: "Captcha verification required",
      });
    }

    const { 
      name, 
      email, 
      phone, 
      companyName, 
      industry,
      address,
      country,
      source,
      requirement,
      notes, 
    } = req.body;
    const attachments = req.files?.map((file) => ({
      name: file.originalname,
      path: `/uploads/leads/${file.filename}`, // 🔥 FIXED
      type: file.mimetype,
      size: file.size,
      uploadedAt: new Date(),
    })) || [];


    // Basic validation
    if (!name || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: "Name, email and Phone Number are required",
      });
    }
    try {
    const verificationURL = "https://www.google.com/recaptcha/api/siteverify";

    const response = await axios.post(
      verificationURL,
      null,
      {
        params: {
          secret: process.env.RECAPTCHA_SECRET_KEY,
          response: captchaToken,
        },
      }
    );

    if (!response.data.success) {
      return res.status(400).json({
        success: false,
        message: "Captcha verification failed",
      });
    }

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Captcha verification error",
    });
  }


    // Save to DB
    const contact = await ContactForm.create({
      name,
      email,
      phone,
      companyName,
      industry,
      address,
      country,
      source: source || "Website",
      requirement,
      notes,
      attachments,
    });
     
    // 2️⃣ Send CRM notification (NEW, isolated)
    console.log("🔔 NOTIFICATION: About to send notification");

    console.log("🔔 NOTIFICATION PAYLOAD:", {
      text: "New website contact form submitted",
      meta: {
        contactFormId: contact._id,
        name,
        email,
      },
    });
    await sendContactFormNotification({
      text: "New website contact form submitted",
      meta: {
        contactFormId: contact._id,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        companyName: contact.companyName,
        industry: contact.industry,
        address: contact.address,
        country: contact.country,
        source: contact.source,
        requirement: contact.requirement,
        notes: contact.notes,
        attachments: contact.attachments,

      },
    });
    console.log("✅ NOTIFICATION: Sent successfully");
    return res.status(201).json({
      success: true,
      message: "Contact form submitted successfully",
      data: {
        id: contact._id,
      },
    });
  } catch (error) {
    console.error("Contact form error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
