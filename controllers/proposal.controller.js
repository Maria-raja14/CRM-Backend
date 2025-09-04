import Proposal from "../models/proposal.model.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import mongoose from "mongoose";

// Load environment variables from .env file
dotenv.config();

export default {
  sendProposal: async (req, res) => {
    const { emails, title, dealTitle, selectedDealId, content, image, id, cc } =
      req.body;

    if (!emails || !title || !dealTitle || !content) {
      return res
        .status(400)
        .json({ error: "Title, dealTitle, emails and content are required" });
    }

    try {
      // format emails
      const recipients = emails
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean);

      // ✅ get deal info if selectedDealId exists
      let dealInfo = null;
      if (selectedDealId) {
        dealInfo = await mongoose.model("Deal").findById(selectedDealId).lean();
        if (!dealInfo) {
          return res.status(404).json({ error: "Deal not found" });
        }
      }

      // ✅ save files for DB
      const attachments = (req.files || []).map((file) => ({
        filename: file.originalname,
        path: file.path,
        mimetype: file.mimetype,
      }));

      // Proposal data to insert/update
      const proposalData = {
        title,
        deal: selectedDealId || null,
        dealTitle,
        email: recipients.join(","),
        cc,
        content,
        image,
        status: "sent",
        attachments,
        companyName: dealInfo?.companyName || "",
        value: dealInfo?.value || 0,
      };

      let proposal;
      if (id) {
        // Update
        proposal = await Proposal.findByIdAndUpdate(id, proposalData, {
          new: true,
        });
        if (!proposal)
          return res.status(404).json({ error: "Proposal not found" });
      } else {
        // Create new
        proposal = new Proposal(proposalData);
        await proposal.save();
      }

      // ✅ Return response immediately (don't wait for email)
      res.json({
        message: "Proposal saved successfully! Email is sending in background.",
        proposal,
      });

      // 🔄 Send mail in background
      const transporter = nodemailer.createTransport({
        service: "gmail",
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      transporter
        .sendMail({
          from: `"Your Company" <${process.env.EMAIL_USER}>`,
          to: recipients.join(","),
          cc: [process.env.OWNER_EMAIL, cc].filter(Boolean).join(","),
          subject: `Proposal: ${title}`,
          html: content,
          attachments: attachments.map((file) => ({
            filename: file.filename,
            path: file.path,
          })),
        })
        .then(() => console.log("✅ Email sent successfully"))
        .catch((err) => console.error("❌ Email send failed:", err));
    } catch (error) {
      console.error("❌ Proposal Error:", error);
      res.status(500).json({ error: error.message });
    }
  },

  updateFollowUp: async (req, res) => {
    const { id } = req.params;
    const { followUpDate, followUpComment } = req.body;

    try {
      const updated = await Proposal.findByIdAndUpdate(
        id,
        {
          followUpDate,
          followUpComment,
          lastReminderAt: null, // reset so cron will send again
        },
        { new: true }
      );

      if (!updated) {
        return res.status(404).json({ error: "Proposal not found" });
      }

      res.json({ message: "Follow-up updated", proposal: updated });
    } catch (err) {
      console.error("❌ FollowUp Update Error:", err);
      res.status(500).json({ error: err.message });
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

  
  getProposal: async (req, res) => {
    const { id } = req.params;

    try {
      // Use the correct field name 'deal' (not 'Deal')
      const proposal = await Proposal.findById(id).populate("deal");

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