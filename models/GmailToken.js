
// import mongoose from "mongoose";

// const gmailTokenSchema = new mongoose.Schema({
//   email: {
//     type: String,
//     required: true,
//     unique: true,
//     lowercase: true,
//     trim: true,
//   },
//   // Optional: link to the CRM user who connected this Gmail account
//   // This enables an extra layer of security lookup if needed
//   crm_user_id: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "User",
//     default: null,
//   },
//   access_token: {
//     type: String,
//     required: true,
//   },
//   refresh_token: {
//     type: String,
//     required: true,
//   },
//   token_type: {
//     type: String,
//     default: "Bearer",
//   },
//   expiry_date: {
//     type: Date,
//     required: true,
//   },
//   scope: {
//     type: String,
//   },
//   is_active: {
//     type: Boolean,
//     default: true,
//   },
//   created_at: {
//     type: Date,
//     default: Date.now,
//   },
//   updated_at: {
//     type: Date,
//     default: Date.now,
//   },
//   last_connected: {
//     type: Date,
//     default: Date.now,
//   },
// });

// gmailTokenSchema.pre("save", function (next) {
//   this.updated_at = new Date();
//   next();
// });

// const GmailToken = mongoose.model("GmailToken", gmailTokenSchema);
// export default GmailToken;//original


import mongoose from "mongoose";

const gmailTokenSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  // ✅ SECURITY: Every token MUST be owned by a CRM user
  crm_user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true, // NOW REQUIRED — no orphan tokens allowed
  },
  access_token: {
    type: String,
    required: true,
  },
  refresh_token: {
    type: String,
    required: true,
  },
  token_type: {
    type: String,
    default: "Bearer",
  },
  expiry_date: {
    type: Date,
    required: true,
  },
  scope: {
    type: String,
  },
  is_active: {
    type: Boolean,
    default: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
  last_connected: {
    type: Date,
    default: Date.now,
  },
});

// ✅ SECURITY: Compound unique index — one Gmail per CRM user
// A CRM user can only have ONE active Gmail connected at a time.
// Two different CRM users CAN connect the same Gmail (allowed),
// but each record is uniquely scoped to that CRM user.
gmailTokenSchema.index({ crm_user_id: 1, email: 1 }, { unique: true });

gmailTokenSchema.pre("save", function (next) {
  this.updated_at = new Date();
  next();
});

const GmailToken = mongoose.model("GmailToken", gmailTokenSchema);
export default GmailToken;