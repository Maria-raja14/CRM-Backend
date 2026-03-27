
// models/facebooklead.model.js
import mongoose from "mongoose";

const facebookLeadSchema = new mongoose.Schema(
  {
    leadId: {
      type: String,
      unique: true,
      sparse: true,
    },
    pageId: {
      type: String,
    },
    formId: {
      type: String,
    },
    adId: {
      type: String,
    },
    adgroupId: {
      type: String,
    },
    // ── Lead fields from Facebook form ──────────────────────────────
    fullName: {
      type: String,
      trim: true,
      default: "",
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    phoneNumber: {
      type: String,
      trim: true,
      default: "",
    },
    state: {
      type: String,
      trim: true,
      default: "",
    },
    // raw field_data array from Facebook (for extra fields)
    rawFieldData: {
      type: Array,
      default: [],
    },
    // ── Linked CRM Lead (after syncing to leads collection) ─────────
    crmLeadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      default: null,
    },
    synced: {
      type: Boolean,
      default: false,
    },
    syncError: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.model("FacebookLead", facebookLeadSchema);