import MassEmail from "../models/massEmail.model.js";
import fs from "fs";
import sendEmail from "../utils/sendEmail.js";

const sendBulkEmail = async (req, res) => {
  try {
    let { recipients, templateTitle, subject, content, scheduledFor } = req.body;
    const logoUrl = "https://res.cloudinary.com/djpljugqo/image/upload/v1771404424/TZI_Logo-04_-_Copy-removebg-preview_o6ocur.png";


    // 🔥 Handle single recipient case (FormData sends string if only 1)
    if (!Array.isArray(recipients)) {
      recipients = [recipients];
    }

    if (!recipients || recipients.length === 0) {
      return res.status(400).json({ message: "Recipients are required" });
    }

    if (!subject || !content) {
      return res
        .status(400)
        .json({ message: "Subject and content are required" });
    }

    // 🔥 Prepare attachments from multer
    const files = req.files || [];

    const attachments = files.map((file) => ({
      filename: file.originalname,
      path: file.path,
    }));

    // 🔥 Send email to each recipient
    const finalHTML = `
      <div style="background-color:#f4f6f8; padding:40px 0;">
        <div style="max-width:600px; margin:auto; background:white; padding:30px; border-radius:8px;">

          <div style="text-align:center; margin-bottom:25px;">
            <img src="${logoUrl}" alt="TZI Logo" width="180" />
          </div>

          <div style="font-size:14px; line-height:1.6; color:#333;">
            ${content}
          </div>

          <hr style="margin:30px 0; border:none; border-top:1px solid #eee;" />

          <div style="text-align:center; font-size:12px; color:#888;">
            © ${new Date().getFullYear()} TZI. All rights reserved.
          </div>

        </div>
      </div>
    `;

    // 🔥 Save email in DB first
    const newEmail = await MassEmail.create({
      recipients,
      templateTitle,
      subject,
      content,
      attachments,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
      status: scheduledFor ? "scheduled" : "pending",
      createdBy: req.user._id,
    });

    // 🔥 If NO scheduled date → send immediately
    if (!scheduledFor) {
      for (const email of recipients) {
        await sendEmail({
          to: email,
          subject,
          html: finalHTML,
          attachments,
        });
      }

      // Update status to sent
      newEmail.status = "sent";
      await newEmail.save();
    }
      res.json({
      success: true,
      message: scheduledFor
        ? "Email scheduled successfully"
        : "Bulk emails sent successfully",
    });


  } catch (err) {
    console.error("Bulk email error:", err);
    res.status(500).json({ message: "Failed to send bulk emails" });
  }
};

export default sendBulkEmail;
export const getEmailHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    let filter = { status: "sent" };

    // If NOT Admin → show only their emails
    if (req.user.role.name !== "Admin") {
      filter.createdBy = req.user._id;
    }

    const total = await MassEmail.countDocuments(filter);

    let query = MassEmail.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // If Admin, populate the createdBy field with user details
    if (req.user.role.name === "Admin") {
      query = query.populate("createdBy", "firstName lastName email");
    }

    const emails = await query;

    res.json({
      success: true,
      data: emails,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });

  } catch (error) {
    console.error("History error:", error);
    res.status(500).json({ message: "Failed to fetch history" });
  }
};

export const getScheduledEmails = async (req, res) => {
  try {
    let filter = { status: "scheduled" };

    // If NOT Admin → show only their scheduled emails
    if (req.user.role.name !== "Admin") {
      filter.createdBy = req.user._id;
    }

    let query = MassEmail.find(filter).sort({ scheduledFor: 1 });
    
    // If Admin, populate the createdBy field with user details
    if (req.user.role.name === "Admin") {
      query = query.populate("createdBy", "firstName lastName email");
    }

    const emails = await query;

    res.json({
      success: true,
      data: emails,
    });

  } catch (error) {
    console.error("Scheduled fetch error:", error);
    res.status(500).json({ message: "Failed to fetch scheduled emails" });
  }
};

export const cancelScheduledEmail = async (req, res) => {
  try {
    const emailId = req.params.id;

    const email = await MassEmail.findById(emailId);

    if (!email) {
      return res.status(404).json({ message: "Email not found" });
    }

    if (email.status !== "scheduled") {
      return res.status(400).json({
        message: "Only scheduled emails can be cancelled",
      });
    }

    email.status = "cancelled";
    await email.save();

    res.json({
      success: true,
      message: "Scheduled email cancelled successfully",
    });

  } catch (error) {
    console.error("Cancel error:", error);
    res.status(500).json({ message: "Failed to cancel email" });
  }
};

export const getSingleEmail = async (req, res) => {
  try {
    const email = await MassEmail.findById(req.params.id);

    if (!email) {
      return res.status(404).json({ message: "Email not found" });
    }

    res.json({
      success: true,
      data: email,
    });

  } catch (error) {
    console.error("Get single email error:", error);
    res.status(500).json({ message: "Failed to fetch email" });
  }
};

export const updateScheduledEmail = async (req, res) => {
  try {
    const { subject, content, recipients, scheduledFor } = req.body;
    const { newAttachments, existingAttachments, removedAttachments } = req.body;
    
    // Parse JSON strings if they come as strings
    let existingAttachmentsArray = [];
    let removedAttachmentsArray = [];
    
    if (existingAttachments) {
      existingAttachmentsArray = typeof existingAttachments === 'string' 
        ? JSON.parse(existingAttachments) 
        : existingAttachments;
    }
    
    if (removedAttachments) {
      removedAttachmentsArray = typeof removedAttachments === 'string' 
        ? JSON.parse(removedAttachments) 
        : removedAttachments;
    }

    const email = await MassEmail.findById(req.params.id);

    if (!email) {
      return res.status(404).json({ message: "Email not found" });
    }

    if (email.status !== "scheduled") {
      return res.status(400).json({
        message: "Only scheduled emails can be edited",
      });
    }

    // Handle recipients (could be string or array)
    let recipientsArray = recipients;
    if (typeof recipients === 'string') {
      recipientsArray = [recipients];
    }

    // Handle new attachments from multer
    const files = req.files || [];
    const newAttachmentsArray = files.map((file) => ({
      filename: file.originalname,
      path: file.path,
    }));

    // 🗑️ DELETE removed attachments from filesystem
    if (removedAttachmentsArray.length > 0) {
      for (const attachment of removedAttachmentsArray) {
        try {
          // Check if file exists and delete it
          if (attachment.path && fs.existsSync(attachment.path)) {
            fs.unlinkSync(attachment.path);
            console.log(`Deleted attachment: ${attachment.path}`);
          }
        } catch (err) {
          console.error("Error deleting attachment file:", err);
          // Continue even if file deletion fails
        }
      }
    }

    // 📦 Combine existing attachments (ones not removed) with new attachments
    const finalAttachments = [
      ...existingAttachmentsArray, // These are the attachments that were kept
      ...newAttachmentsArray,       // These are the newly uploaded ones
    ];

    // Update email fields
    email.subject = subject || email.subject;
    email.content = content || email.content;
    email.recipients = recipientsArray || email.recipients;
    email.attachments = finalAttachments;
    
    if (scheduledFor) {
      email.scheduledFor = new Date(scheduledFor);
    }

    await email.save();

    res.json({
      success: true,
      message: "Scheduled email updated successfully",
      data: email,
    });

  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ message: "Failed to update email" });
  }
};

export const deleteEmail = async (req, res) => {
  try {
    const email = await MassEmail.findById(req.params.id);

    if (!email) {
      return res.status(404).json({
        success: false,
        message: "Email not found",
      });
    }

    await email.deleteOne();

    res.json({
      success: true,
      message: "Email deleted successfully",
    });

  } catch (error) {
    console.error("Delete email error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete email",
    });
  }
};
