// import mongoose from "mongoose";

// const dealSchema = new mongoose.Schema({
//   leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead" },
//   dealTitle: { type: String, require: true },
//   dealName: { type: String, required: true },
//   assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
//   value: { type: String, required: true },

//   stage: {
//     type: String,
//     enum: ["Qualification", "Negotiation", "Proposal Sent", "Closed Won", "Closed Lost"],
//     default: "Qualification",
//   },

//   notes: { type: String },
//   phoneNumber: { type: String },
//   email: { type: String },
//   source: { type: String },
//   companyName: { type: String },
//   industry: { type: String },
//   requirement: { type: String },
//   address: { type: String },
//   country: { type: String },

//   // ✅ FIXED: only one attachments field, storing objects
//   attachments: [
//     {
//       name: String,
//       path: String,
//       type: String,
//     },
//   ],

//   createdAt: { type: Date, default: Date.now },
//   updatedAt: { type: Date, default: Date.now },
// });

// // Update `updatedAt` before saving
// dealSchema.pre("save", function (next) {
//   this.updatedAt = new Date();
//   next();
// });

// const Deal = mongoose.model("Deal", dealSchema);
// export default Deal; //ori

import mongoose from "mongoose";

const dealSchema = new mongoose.Schema({
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead" },
  dealTitle: { type: String, require: true },
  dealName: { type: String, required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  value: { type: String, required: true }, // store "$44", "₹5000", "TJS11111"
  value: { type: String, required: true },
  currency: { type: String, default: "INR" }, // Add this field

  stage: {
    type: String,
    enum: [
      "Qualification",
      "Negotiation",

      "Proposal Sent",
      "Closed Won",
      "Closed Lost",
    ],
    default: "Qualification",
  },

  notes: { type: String },
  phoneNumber: { type: String },
  email: { type: String },
  source: { type: String },
  companyName: { type: String },
  industry: { type: String },
  requirement: { type: String },
  address: { type: String },
  country: { type: String }, // 🔹 Added field
  attachments: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Update `updatedAt` before saving
dealSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

const Deal = mongoose.model("Deal", dealSchema);
export default Deal; //ori
