






import Proposal from "../models/proposal.model.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

export default {
  // 📌 1️⃣ Create Proposal and Save to Database
  createProposal: async (req, res) => {
    const { title, dealTitle, email, content, image, status } = req.body;

    if (!title || !dealTitle || !email || !content) {
      return res.status(400).json({ error: "All fields are required" });
    }

    try {
      const newProposal = new Proposal({
        title,
        dealTitle,
        email,
        content,
        image,
        status: status || "draft",
      });
      await newProposal.save();
      res.json({
        message: "Proposal saved successfully",
        proposal: newProposal,
      });
    } catch (error) {
      console.error("Database Error:", error);
      res.status(500).json({ error: "Server error" });
    }
  },

sendProposal: async (req, res) => {
  const { emails, title, deal, content, image, id } = req.body;

  // Validate required fields
  if (!emails || !title || !deal || !content) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    console.log("🟢 Sending email to:", emails);

    // ✅ Configure Nodemailer Transporter
    let transporter = nodemailer.createTransport({
      service: "gmail",
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Ensure emails is an array
    const recipients = Array.isArray(emails) ? emails.join(",") : emails;

    // ✅ Email Content
    let mailOptions = {
      from: `"Your Company Name" <${process.env.EMAIL_USER}>`,
      to: recipients,                     // multiple recipients
      cc: process.env.OWNER_EMAIL,        // CC to your owner
      subject: `Proposal: ${title}`,
      html: content,                      // HTML content
    };

    // ✅ Send Email
    let info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully:", info.response);

    // Save or update proposal
    let proposal;
    if (id) {
      proposal = await Proposal.findByIdAndUpdate(
        id,
        { title, deal, email: recipients, content, image, status: "sent" },
        { new: true }
      );
      if (!proposal) return res.status(404).json({ error: "Proposal not found" });
    } else {
      proposal = new Proposal({
        title,
        deal,
        email: recipients,
        content,
        image,
        status: "sent",
      });
      await proposal.save();
    }

    res.json({
      message: "Proposal sent and stored successfully",
      proposal,
    });
  } catch (error) {
    console.error("Email Error:", error);
    res.status(500).json({ error: error.message });
  }
},


  // 📌 3️⃣ Get All Proposals
  getAllProposals: async (req, res) => {
    try {
      const proposals = await Proposal.find().sort({ createdAt: -1 });
      res.json(proposals);
    } catch (error) {
      console.error("Database Fetch Error:", error);
      res.status(500).json({ error: "Server error" });
    }
  },

  // 📌 4️⃣ Update Proposal Status
  updateStatus: async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
      const updatedProposal = await Proposal.findByIdAndUpdate(
        id,
        { status },
        { new: true }
      );
      
      if (!updatedProposal) {
        return res.status(404).json({ error: "Proposal not found" });
      }
      
      res.json({ message: "Status updated", proposal: updatedProposal });
    } catch (error) {
      console.error("Status Update Error:", error);
      res.status(500).json({ error: "Failed to update status" });
    }
  },

  // 📌 5️⃣ Update Proposal
  updateProposal: async (req, res) => {
    const { id } = req.params;
    const { title, dealTitle, email, content, image, status } = req.body;

    try {
      const updatedProposal = await Proposal.findByIdAndUpdate(
        id,
        { title, dealTitle, email, content, image, status },
        { new: true }
      );

      if (!updatedProposal) {
        return res.status(404).json({ error: "Proposal not found" });
      }

      res.json({ message: "Proposal updated", proposal: updatedProposal });
    } catch (error) {
      console.error("Update Error:", error);
      res.status(500).json({ error: error.message });
    }
  },

  // 📌 6️⃣ Delete Proposal
  deleteProposal: async (req, res) => {
    const { id } = req.params;

    try {
      const deleted = await Proposal.findByIdAndDelete(id);
      if (!deleted) {
        return res.status(404).json({ error: "Proposal not found" });
      }

      res.json({ message: "Proposal deleted successfully" });
    } catch (error) {
      console.error("Delete Error:", error);
      res.status(500).json({ error: error.message });
    }
  },

  // 📌 7️⃣ Get Single Proposal
  getProposal: async (req, res) => {
    const { id } = req.params;

    try {
      const proposal = await Proposal.findById(id);
      if (!proposal) {
        return res.status(404).json({ error: "Proposal not found" });
      }

      res.json(proposal);
    } catch (error) {
      console.error("Fetch Error:", error);
      res.status(500).json({ error: error.message });
    }
  },
};