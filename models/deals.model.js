


// import mongoose from "mongoose";

// const dealSchema = new mongoose.Schema({
//   leadId:     { type: mongoose.Schema.Types.ObjectId, ref: "Lead" },
//   dealTitle:  { type: String },
//   dealName:   { type: String, required: true },
//   assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

//   // Stored as "1,00,000 INR"
//   value: { type: String, default: "0" },
//   currency: { type: String, default: "INR" },

//   stage: {
//     type: String,
//     enum: [
//       "Qualification",
//       "Negotiation",
//       "Proposal",
//       "Proposal Sent",
//       "Closed Won",
//       "Closed Lost",
//     ],
//     default: "Qualification",
//   },

//   notes:       { type: String },
//   phoneNumber: { type: String },
//   email:       { type: String },
//   source:      { type: String },

//   // ✅ CHANGED: companyName → destination
//   // companyName kept as alias for backward compat with old documents
//   destination: { type: String },
 

//   // ✅ CHANGED: industry → duration
//   // industry kept as alias for backward compat with old documents
//   duration:    { type: String },
 

//   requirement: { type: String },
//   address:     { type: String },
//   country:     { type: String },

//   attachments: [
//     {
//       name:       { type: String, required: true },
//       path:       { type: String, required: true },
//       type:       { type: String },
//       size:       { type: Number },
//       uploadedAt: { type: Date, default: Date.now },
//     },
//   ],

//   followUpDate:   { type: Date },
//   followUpStatus: { type: String },

//   createdAt: { type: Date, default: Date.now },
//   updatedAt: { type: Date, default: Date.now },
// });

// dealSchema.pre("save", function (next) {
//   this.updatedAt = new Date();
//   next();
// });

// const Deal = mongoose.model("Deal", dealSchema);
// export default Deal;//original


import mongoose from "mongoose";

const dealSchema = new mongoose.Schema({
  leadId:     { type: mongoose.Schema.Types.ObjectId, ref: "Lead" },
  dealTitle:  { type: String },
  dealName:   { type: String, required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  // Stored as "1,00,000 INR"
  value:    { type: String, default: "0" },
  currency: { type: String, default: "INR" },

  stage: {
    type: String,
    enum: [
      "Qualification", "Negotiation", "Proposal",
      "Proposal Sent", "Closed Won", "Closed Lost",
    ],
    default: "Qualification",
  },

  notes:       { type: String },
  phoneNumber: { type: String },
  email:       { type: String },
  source:      { type: String },

  // ── Destination / Duration (renamed from companyName / industry) ──
  destination: { type: String },
  duration:    { type: String },

  requirement: { type: String },
  address:     { type: String },
  country:     { type: String },

  // ══════════════════════════════════════════════════
  // COST FIELDS
  // ══════════════════════════════════════════════════
  purchasingLandCost:   { type: Number, default: 0 },
  purchasingTicketCost: { type: Number, default: 0 },
  sellingLandCost:      { type: Number, default: 0 },
  sellingTicketCost:    { type: Number, default: 0 },
  // Computed / cached at save time for easy querying
  totalPurchasingCost:  { type: Number, default: 0 },
  totalSellingCost:     { type: Number, default: 0 },
  profit:               { type: Number, default: 0 },

  attachments: [
    {
      name:       { type: String, required: true },
      path:       { type: String, required: true },
      type:       { type: String },
      size:       { type: Number },
      uploadedAt: { type: Date, default: Date.now },
    },
  ],

  followUpDate:   { type: Date },
  followUpStatus: { type: String },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

/* ── Auto-compute totals on save ── */
dealSchema.pre("save", function (next) {
  this.updatedAt = new Date();

  const purchLand   = Number(this.purchasingLandCost   || 0);
  const purchTicket = Number(this.purchasingTicketCost || 0);
  const sellLand    = Number(this.sellingLandCost      || 0);
  const sellTicket  = Number(this.sellingTicketCost    || 0);

  this.totalPurchasingCost = purchLand + purchTicket;
  this.totalSellingCost    = sellLand  + sellTicket;
  this.profit              = this.totalSellingCost - this.totalPurchasingCost;

  next();
});

const Deal = mongoose.model("Deal", dealSchema);
export default Deal;