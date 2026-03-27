// // models/facebooklead.model.js
// import mongoose from "mongoose";

// const facebookLeadSchema = new mongoose.Schema(
//   {
//     // ── Core identity ──────────────────────────────────────────────────────────
//     leadgenId: { type: String, unique: true, sparse: true }, // Facebook's unique lead ID
//     formId:    { type: String, default: "" },
//     adId:      { type: String, default: "" },
//     pageId:    { type: String, default: "" },
//     adName:    { type: String, default: "" },
//     formName:  { type: String, default: "" },

//     // ── Contact info (from Facebook Instant Form) ──────────────────────────────
//     leadName:    { type: String, default: "Unknown" },   // full_name
//     email:       { type: String, default: "" },
//     phoneNumber: { type: String, default: "" },          // phone_number
//     state:       { type: String, default: "" },          // state (Indian state or region)

//     // ── CRM fields ────────────────────────────────────────────────────────────
//     source:      { type: String, default: "Facebook Lead Ad" },
//     status:      {
//       type: String,
//       enum: ["Hot", "Warm", "Cold", "Junk", "Converted"],
//       default: "Cold",
//     },
//     destination:  { type: String, default: "" },
//     country:      { type: String, default: "" },
//     followUpDate: { type: Date,   default: null },
//     notes:        { type: String, default: "" },
//     assignTo:     { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

//     // ── Raw fields (all form answers) ─────────────────────────────────────────
//     rawFields: { type: mongoose.Schema.Types.Mixed, default: {} },
//   },
//   { timestamps: true }
// );

// // Index for faster search
// facebookLeadSchema.index({ leadName: "text", email: "text", phoneNumber: "text" });
// facebookLeadSchema.index({ status: 1 });
// facebookLeadSchema.index({ createdAt: -1 });

// const FacebookLead = mongoose.model("FacebookLead", facebookLeadSchema);
// export default FacebookLead;


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