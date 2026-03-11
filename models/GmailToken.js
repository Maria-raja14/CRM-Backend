
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
  // SECURITY FIX: crm_user_id is now REQUIRED — every Gmail token MUST be
  // bound to exactly one CRM user.  No token without an owner.
  crm_user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,   // ← was "default: null" — that is the root cause of the leak
    index: true,
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

// Compound unique index: one active Gmail account per CRM user
gmailTokenSchema.index({ crm_user_id: 1, is_active: 1 });
// Also unique on email+crm_user_id so the same Gmail can't be shared
gmailTokenSchema.index({ email: 1, crm_user_id: 1 }, { unique: true });

gmailTokenSchema.pre("save", function (next) {
  this.updated_at = new Date();
  next();
});

const GmailToken = mongoose.model("GmailToken", gmailTokenSchema);
export default GmailToken;