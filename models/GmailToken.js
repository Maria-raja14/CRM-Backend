
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


// models/GmailToken.js
// ─────────────────────────────────────────────────────────────────────────────
// SECURITY NOTE
// crm_user_id MUST be set for every token.  The gmailRoutes.js resolveEmail()
// function only returns a Gmail address when the GmailToken row has a
// crm_user_id that matches the JWT-authenticated user.  Without that field
// populated, no route (except the two public OAuth routes) will work.
//
// HOW TO POPULATE EXISTING ROWS:
//   After deploying this change, each user must re-connect their Gmail account
//   OR you can run the one-time migration in scripts/migrateGmailTokens.js.
// ─────────────────────────────────────────────────────────────────────────────

import mongoose from "mongoose";

const gmailTokenSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },

  // ✅ REQUIRED for security: links this Gmail account to one CRM user.
  //    resolveEmail() in gmailRoutes.js checks this field to ensure
  //    User A can NEVER read User B's emails.
  crm_user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,   // null only for tokens created before this migration
    index: true,     // fast lookup by user
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
    index: true,
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

gmailTokenSchema.pre("save", function (next) {
  this.updated_at = new Date();
  next();
});

const GmailToken = mongoose.model("GmailToken", gmailTokenSchema);
export default GmailToken;