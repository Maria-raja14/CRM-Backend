// import mongoose from 'mongoose';

// const whatsappMessageSchema = new mongoose.Schema({
//   to: { type: String, required: true },
//   from: { type: String, required: true },
//   body: { type: String },
//   contentSid: { type: String },
//   contentVariables: { type: Object },
//   status: { type: String, default: 'queued' },
//   messageSid: { type: String, unique: true },
//   direction: { type: String, enum: ['outbound', 'inbound'] },
//   leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
//   dealId: { type: mongoose.Schema.Types.ObjectId, ref: 'Deal' },
//   createdAt: { type: Date, default: Date.now }
// });

// export default mongoose.model('WhatsAppMessage', whatsappMessageSchema);


import mongoose from "mongoose";

const whatsappMessageSchema = new mongoose.Schema(
  {
    // The contact's phone number (e.g. whatsapp:+91XXXXXXXXXX)
    contactNumber: {
      type: String,
      required: true,
      trim: true,
    },

    // Display name for the contact (optional, set manually or from CRM)
    contactName: {
      type: String,
      default: "",
      trim: true,
    },

    // "outbound" = sent by us, "inbound" = received from customer
    direction: {
      type: String,
      enum: ["inbound", "outbound"],
      required: true,
    },

    // Message body text
    body: {
      type: String,
      default: "",
    },

    // Twilio message SID
    messageSid: {
      type: String,
      default: "",
    },

    // Twilio status: queued | sending | sent | delivered | read | failed | undelivered
    status: {
      type: String,
      default: "sent",
    },

    // Media attachments (images, docs) — Twilio MediaUrl array
    mediaUrls: [
      {
        type: String,
      },
    ],

    // Whether this inbound message has been read in the CRM UI
    read: {
      type: Boolean,
      default: false,
    },

    // Linked CRM contact / lead id (optional)
    crmContactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contact",
      default: null,
    },

    // Which CRM user sent this (for outbound)
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

// Index for fast conversation fetch
whatsappMessageSchema.index({ contactNumber: 1, createdAt: 1 });
whatsappMessageSchema.index({ read: 1, direction: 1 });

const WhatsappMessage = mongoose.model("WhatsappMessage", whatsappMessageSchema);
export default WhatsappMessage;