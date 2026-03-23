import Proposal from "../models/proposal.model.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";

dotenv.config();

/* ── Nodemailer transporter ─────────────────────────────────────────── */
const createTransporter = () =>
  nodemailer.createTransport({
    service: "gmail",
    host:    "smtp.gmail.com",
    port:    587,
    secure:  false,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });

/* ══════════════════════════════════════════════════════════════════════
   KEY FIX: Convert base64 <img src="data:..."> tags in HTML content
   into CID (Content-ID) inline attachments for proper email rendering.

   Email clients like Gmail block/strip base64 data URLs in <img> tags,
   showing the filename as broken text instead. CID attachments are the
   correct email-standard way to embed images inline.
   ══════════════════════════════════════════════════════════════════════ */
function extractBase64Images(htmlContent) {
  const cidAttachments = [];
  let counter = 0;

  // Match all base64 data URLs in img src attributes
  const processedHtml = htmlContent.replace(
    /src="(data:([a-zA-Z0-9]+\/[a-zA-Z0-9+.-]+);base64,([^"]+))"/g,
    (match, fullDataUrl, mimeType, base64Data) => {
      counter++;
      // Derive file extension from mime type (e.g. image/jpeg -> jpg)
      const ext = mimeType.split("/")[1]
        .replace("jpeg", "jpg")
        .replace("svg+xml", "svg");
      const cid = `inline_image_${counter}_${Date.now()}@proposal`;
      const filename = `image_${counter}.${ext}`;

      cidAttachments.push({
        filename,
        cid,                          // referenced in HTML as cid:xxx
        content: base64Data,          // base64 string
        encoding: "base64",
        contentType: mimeType,
        contentDisposition: "inline", // tells client to show inline, not as download
      });

      // Replace the data URL src with the CID reference
      return `src="cid:${cid}"`;
    }
  );

  return { processedHtml, cidAttachments };
}

export default {

  /* ═══════════════════════════════════════════════════════════
     1.  Send / Update  –  POST /proposal/mailsend
     ═══════════════════════════════════════════════════════════ */
  sendProposal: async (req, res) => {
    const { emails, title, dealTitle, selectedDealId, content, image, id, cc, status } = req.body;

    if (!emails || !title || !dealTitle) {
      return res.status(400).json({ error: "title, dealTitle and emails are required" });
    }

    try {
      const recipients = emails.split(",").map((e) => e.trim()).filter(Boolean);

      /* Deal info (optional) */
      let dealInfo = null;
      if (selectedDealId && mongoose.Types.ObjectId.isValid(selectedDealId)) {
        dealInfo = await mongoose.model("Deal").findById(selectedDealId).lean();
      }

      /* Attachment records from multer */
      const attachmentRecords = (req.files || []).map((file) => ({
        filename: file.originalname,
        path:     file.path,
        mimetype: file.mimetype,
      }));

      const proposalPayload = {
        title,
        deal:        selectedDealId && mongoose.Types.ObjectId.isValid(selectedDealId) ? selectedDealId : null,
        dealTitle,
        email:       recipients.join(","),
        cc:          cc  || "",
        content:     content || "",
        image:       image   || "",
        status:      status  || "sent",
        attachments: attachmentRecords,
        companyName: dealInfo?.companyName || "",
        value:       dealInfo?.value       || 0,
      };

      /* Create or update */
      let proposal;
      if (id) {
        proposal = await Proposal.findByIdAndUpdate(id, proposalPayload, { new: true });
        if (!proposal) return res.status(404).json({ error: "Proposal not found" });
      } else {
        proposal = new Proposal(proposalPayload);
        await proposal.save();
      }

      /* Respond immediately */
      res.json({ message: "Proposal saved. Email sending in background.", proposal });

      /* Send email only when status is "sent" */
      if ((status || "sent") !== "draft") {
        _sendEmail({
          recipients,
          cc: cc || undefined,
          title,
          content: content || "",
          attachments: attachmentRecords,
        }).catch((err) => console.error("❌ Email error:", err.message));
      }
    } catch (error) {
      console.error("❌ sendProposal error:", error);
      if (!res.headersSent) res.status(500).json({ error: error.message });
    }
  },

  /* ═══════════════════════════════════════════════════════════
     2.  Get All  –  GET /proposal/getall
     ═══════════════════════════════════════════════════════════ */
  getAllProposals: async (req, res) => {
    try {
      const proposals = await Proposal.find().sort({ createdAt: -1 });
      res.json(proposals);
    } catch (error) {
      console.error("getAllProposals error:", error);
      res.status(500).json({ error: "Server error" });
    }
  },

  /* ═══════════════════════════════════════════════════════════
     3.  Get Single  –  GET /proposal/:id
     ═══════════════════════════════════════════════════════════ */
  getProposal: async (req, res) => {
    try {
      const proposal = await Proposal.findById(req.params.id).populate("deal");
      if (!proposal) return res.status(404).json({ error: "Proposal not found" });
      res.json(proposal);
    } catch (error) {
      console.error("getProposal error:", error);
      res.status(500).json({ error: error.message });
    }
  },

  /* ═══════════════════════════════════════════════════════════
     4.  Update Status  –  PUT /proposal/updatestatus/:id
     ═══════════════════════════════════════════════════════════ */
  updateStatus: async (req, res) => {
    try {
      const updated = await Proposal.findByIdAndUpdate(
        req.params.id, { status: req.body.status }, { new: true }
      );
      if (!updated) return res.status(404).json({ error: "Proposal not found" });
      res.json({ message: "Status updated", proposal: updated });
    } catch (error) {
      console.error("updateStatus error:", error);
      res.status(500).json({ error: "Failed to update status" });
    }
  },

  /* ═══════════════════════════════════════════════════════════
     5.  Update Proposal  –  PUT /proposal/update/:id
     ═══════════════════════════════════════════════════════════ */
  updateProposal: async (req, res) => {
    const { title, dealTitle, email, content, image, status } = req.body;
    try {
      const updated = await Proposal.findByIdAndUpdate(
        req.params.id,
        { title, dealTitle, email, content, image, status },
        { new: true }
      );
      if (!updated) return res.status(404).json({ error: "Proposal not found" });
      res.json({ message: "Proposal updated", proposal: updated });
    } catch (error) {
      console.error("updateProposal error:", error);
      res.status(500).json({ error: error.message });
    }
  },

  /* ═══════════════════════════════════════════════════════════
     6.  Delete  –  DELETE /proposal/delete/:id
     ═══════════════════════════════════════════════════════════ */
  deleteProposal: async (req, res) => {
    try {
      const deleted = await Proposal.findByIdAndDelete(req.params.id);
      if (!deleted) return res.status(404).json({ error: "Proposal not found" });
      res.json({ message: "Proposal deleted successfully" });
    } catch (error) {
      console.error("deleteProposal error:", error);
      res.status(500).json({ error: error.message });
    }
  },

   /* ═══════════════════════════════════════════════════════════
     7.  Bulk Delete  –  DELETE /proposal/deletemany
         Body: { ids: ["id1", "id2", ...] }
     ═══════════════════════════════════════════════════════════ */
  deleteManyProposals: async (req, res) => {
    const { ids } = req.body;
 
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "ids array is required and must not be empty" });
    }
 
    // Validate all ids are valid ObjectIds
    const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
      return res.status(400).json({ error: "No valid proposal IDs provided" });
    }
 
    try {
      const result = await Proposal.deleteMany({ _id: { $in: validIds } });
      res.json({
        message: `${result.deletedCount} proposal(s) deleted successfully`,
        deletedCount: result.deletedCount,
      });
    } catch (error) {
      console.error("deleteManyProposals error:", error);
      res.status(500).json({ error: error.message });
    }
  },

};

/* ── Private: send email ────────────────────────────────────────────── */
async function _sendEmail({ recipients, cc, title, content, attachments }) {
  const transporter = createTransporter();

  // KEY FIX: Extract base64 images from HTML and convert to CID inline attachments
  const { processedHtml, cidAttachments } = extractBase64Images(content || "");

  console.log(`📧 Found ${cidAttachments.length} inline image(s) to embed via CID`);

  /* Build file attachments from disk (PDFs, docs, etc.) */
  const fileAttachments = (attachments || [])
    .filter((att) => {
      const full = path.resolve(att.path);
      if (!fs.existsSync(full)) {
        console.warn(`⚠️  Attachment not found, skipping: ${full}`);
        return false;
      }
      return true;
    })
    .map((att) => ({
      filename:    att.filename,
      path:        path.resolve(att.path),
      contentType: att.mimetype,
    }));

  await transporter.sendMail({
    from:    `"UenjoyTours" <${process.env.EMAIL_USER}>`,
    to:      recipients.join(","),
    cc:      cc || undefined,
    subject: `Proposal: ${title}`,
    html:    processedHtml,           // HTML with cid: src references
    attachments: [
      ...cidAttachments,              // inline CID images (show inside email body)
      ...fileAttachments,             // regular file attachments (show at bottom)
    ],
  });

  console.log(`✅ Email sent to: ${recipients.join(", ")}`);
}//all work correctly..


