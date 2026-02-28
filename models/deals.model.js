import mongoose from "mongoose";

const dealSchema = new mongoose.Schema({
  leadId:     { type: mongoose.Schema.Types.ObjectId, ref: "Lead" },
  dealTitle:  { type: String },
  dealName:   { type: String, required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  // Stored as "1,00,000 INR"  (no duplicate field)
  value:    { type: String, default: "0" },
  currency: { type: String, default: "INR" },

  stage: {
    type: String,
    enum: [
      "Qualification",
      "Negotiation",
      "Proposal",
      "Proposal Sent",
      "Closed Won",
      "Closed Lost",
    ],
    default: "Qualification",
  },

  notes:       { type: String },
  phoneNumber: { type: String },
  email:       { type: String },
  source:      { type: String },
  companyName: { type: String },
  industry:    { type: String },
  requirement: { type: String },
  address:     { type: String },
  country:     { type: String },

  // ✅ FIXED: Attachments stored as proper objects NOT flat strings.
  // Old: attachments: [{ type: String }]  → caused .name/.path to be undefined
  // New: each attachment has name, path, type, size, uploadedAt
  attachments: [
    {
      name:       { type: String, required: true }, // original filename e.g. "report.pdf"
      path:       { type: String, required: true }, // "uploads/deals/1234-xyz.pdf" — NO leading slash
      type:       { type: String },                  // MIME type e.g. "application/pdf"
      size:       { type: Number },                  // file size in bytes
      uploadedAt: { type: Date, default: Date.now },
    },
  ],

  followUpDate:   { type: Date },
  followUpStatus: { type: String },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

dealSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

const Deal = mongoose.model("Deal", dealSchema);
export default Deal;