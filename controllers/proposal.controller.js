import Proposal from "../models/proposal.model.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

export default {
  

  //   sendProposal : async (req, res) => {
  
//   console.log("REQ BODY:", req.body);
//   console.log("REQ FILES:", req.files);

//   const { emails, title, dealTitle, selectedDealId, content, image, id, cc } =
//     req.body;

//   if (!emails || !title || !dealTitle || !content) {
//     return res
//       .status(400)
//       .json({ error: "Title, dealTitle, emails and content are required" });
//   }

//   try {
//     // format emails
//     const recipients = emails
//       .split(",")
//       .map((e) => e.trim())
//       .filter(Boolean);

//     // ✅ save files for DB + nodemailer
//     const attachments = (req.files || []).map((file) => ({
//       filename: file.originalname,
//       path: file.path, // multer saves file on disk
//       mimetype: file.mimetype,
//     }));

//     // ✅ Save or update proposal
//     let proposal;
//     if (id) {
//       proposal = await Proposal.findByIdAndUpdate(
//         id,
//         {
//           title,
//           deal: selectedDealId || null,
//           dealTitle,
//           email: recipients.join(","),
//           cc,
//           content,
//           image,
//           status: "sent",
//           attachments, // save attachments in DB
//         },
//         { new: true }
//       );
//       if (!proposal)
//         return res.status(404).json({ error: "Proposal not found" });
//     } else {
//       proposal = new Proposal({
//         title,
//         deal: selectedDealId || null,
//         dealTitle,
//         email: recipients.join(","),
//         cc,
//         content,
//         image,
//         status: "sent",
//         attachments, // save attachments in DB
//       });
//       await proposal.save();
//     }

//     // ✅ Email sending
//     const transporter = nodemailer.createTransport({
//       service: "gmail",
//       host: "smtp.gmail.com",
//       port: 587,
//       secure: false,
//       auth: {
//         user: process.env.EMAIL_USER,
//         pass: process.env.EMAIL_PASS,
//       },
//     });

//     await transporter.sendMail({
//       from: `"Your Company" <${process.env.EMAIL_USER}>`,
//       to: recipients.join(","),
//       cc: [process.env.OWNER_EMAIL, cc].filter(Boolean).join(","),
//       subject: `Proposal: ${title}`,
//       html: content,
//       attachments: attachments.map((file) => ({
//         filename: file.filename,
//         path: file.path, // use path for nodemailer too
//       })),
//     });

//     res.json({ message: "Proposal sent successfully!", proposal });
//   } catch (error) {
//     console.error("❌ Proposal Error:", error);
//     res.status(500).json({ error: error.message });
//   }
// },
  
  sendProposal: async (req, res) => {
  console.log("REQ BODY:", req.body);
  console.log("REQ FILES:", req.files);

  const { emails, title, dealTitle, selectedDealId, content, image, id, cc, status } =
    req.body;

  // For drafts, only title is required
  if (status !== "draft" && (!emails || !title || !dealTitle || !content)) {
    return res
      .status(400)
      .json({ error: "Title, dealTitle, emails and content are required" });
  }

  try {
    // format emails
    const recipients = emails
      ? emails.split(",").map((e) => e.trim()).filter(Boolean)
      : [];

    // ✅ save files for DB + nodemailer
    const attachments = (req.files || []).map((file) => ({
      filename: file.originalname,
      path: file.path, // multer saves file on disk
      mimetype: file.mimetype,
    }));

    // ✅ Save or update proposal
    let proposal;
    if (id) {
      proposal = await Proposal.findByIdAndUpdate(
        id,
        {
          title,
          deal: selectedDealId || null,
          dealTitle,
          email: recipients.join(","),
          cc,
          content,
          image,
          status,
          attachments, // save attachments in DB
        },
        { new: true }
      );
      if (!proposal)
        return res.status(404).json({ error: "Proposal not found" });
    } else {
      proposal = new Proposal({
        title,
        deal: selectedDealId || null,
        dealTitle,
        email: recipients.join(","),
        cc,
        content,
        image,
        status,
        attachments, // save attachments in DB
      });
      await proposal.save();
    }

    // Only send email if status is "sent"
    if (status === "sent") {
      // ✅ Email sending
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

      await transporter.sendMail({
        from: `"Your Company" <${process.env.EMAIL_USER}>`,
        to: recipients.join(","),
        cc: [process.env.OWNER_EMAIL, cc].filter(Boolean).join(","),
        subject: `Proposal: ${title}`,
        html: content,
        attachments: attachments.map((file) => ({
          filename: file.filename,
          path: file.path, // use path for nodemailer too
        })),
      });
    }

    res.json({ 
      message: status === "draft" ? "Draft saved successfully!" : "Proposal sent successfully!", 
      proposal 
    });
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
        lastReminderAt: null // reset so cron will send again
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
