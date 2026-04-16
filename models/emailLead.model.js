// models/emailLead.model.js
// Stores leads that arrive via inbound email (e.g. from TripMagics booking enquiries)

import mongoose from "mongoose";
import Notification from "./notification.model.js";
import { notifyUser } from "../realtime/socket.js";

const emailLeadSchema = new mongoose.Schema(
  {
    // ── Core lead fields (mirrors leads.model.js) ──────────────────────────
    leadName:    { type: String, required: true },
    phoneNumber: { type: String, default: "" },
    email:       { type: String, default: "" },
    destination: { type: String, default: "Not Specified" },
    country:     { type: String, default: "" },
    address:     { type: String, default: "" },
    duration:    { type: String, default: "" },
    requirement: { type: String, default: "" },
    noOfAdults:   { type: Number, default: null },
    noOfChildren: { type: Number, default: null },
    travelDate:   { type: Date,   default: null },

    // ── Email-specific fields ──────────────────────────────────────────────
    source:          { type: String, default: "Email Lead" },  // always "Email Lead"
    rawEmailSubject: { type: String, default: "" },            // original email subject
    rawEmailBody:    { type: String, default: "" },            // original email body (plain)
    fromEmail:       { type: String, default: "" },            // sender's email address
    messageId:       { type: String, default: "", unique: true, sparse: true }, // Gmail message ID (dedup)

    // ── CRM fields ────────────────────────────────────────────────────────
    assignTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    status: {
      type:    String,
      enum:    ["Hot", "Warm", "Cold", "Junk", "Converted"],
      default: "Cold",
    },
    followUpDate:   { type: Date,    default: null },
    lastReminderAt: { type: Date,    default: null },
    notes:          { type: String,  default: "" },
    attachments:    { type: Array,   default: [] },
  },
  { timestamps: true }
);

emailLeadSchema.index({ email: 1 });
emailLeadSchema.index({ status: 1 });
emailLeadSchema.index({ createdAt: -1 });

// ── Cleanup notifications when an email lead is deleted ───────────────────────
emailLeadSchema.post("findOneAndDelete", async function (doc) {
  if (!doc) return;
  const leadId = doc._id.toString();
  const deleted = await Notification.find({ "meta.leadId": leadId }).lean();
  await Notification.deleteMany({ "meta.leadId": leadId });
  const map = new Map();
  deleted.forEach((n) => {
    if (!map.has(n.userId)) map.set(n.userId, []);
    map.get(n.userId).push(n._id.toString());
  });
  for (const [userId, ids] of map.entries()) notifyUser(userId, "notification_deleted", { ids });
});

const EmailLead = mongoose.model("EmailLead", emailLeadSchema);
export default EmailLead;