
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


/**
 * GmailToken.js
 *
 * SECURITY MODEL:
 *   - Every token row MUST have crm_user_id (required: true).
 *   - One active token per CRM user: unique index on { crm_user_id: 1 }
 *     with a partial filter so it only enforces uniqueness when is_active=true.
 *   - Tokens are NEVER looked up by email from client input.
 *     Only crm_user_id (from the verified JWT) is used for lookups.
 *   - The email field is stored only for display purposes.
 *
 * MULTI-USER GUARANTEE:
 *   - Person A connects Gmail → row: { crm_user_id: A_id, email: a@gmail.com, is_active: true }
 *   - Person B connects Gmail → row: { crm_user_id: B_id, email: b@gmail.com, is_active: true }
 *   - Person B checks status  → findOne({ crm_user_id: B_id, is_active: true }) → only B's token
 *   - Person B sees Person A's mail: IMPOSSIBLE with this schema + service code
 */

import mongoose from "mongoose";

const gmailTokenSchema = new mongoose.Schema(
  {
    // ── OWNER ─────────────────────────────────────────────────────────────────
    crm_user_id: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,    // HARD REQUIREMENT — no token without an owner
      index:    true,
    },

    // ── GMAIL IDENTITY (for display only, never for auth/lookup) ─────────────
    email: {
      type:      String,
      required:  true,
      lowercase: true,
      trim:      true,
    },

    // ── OAUTH TOKENS ──────────────────────────────────────────────────────────
    access_token: {
      type:     String,
      required: true,
    },
    refresh_token: {
      type:     String,
      required: true,
    },
    token_type: {
      type:    String,
      default: "Bearer",
    },
    expiry_date: {
      type:     Date,
      required: true,
    },
    scope: {
      type: String,
    },

    // ── STATUS ────────────────────────────────────────────────────────────────
    is_active: {
      type:    Boolean,
      default: true,
      index:   true,
    },
    last_connected: {
      type:    Date,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// ── INDEXES ───────────────────────────────────────────────────────────────────

// PRIMARY SECURITY INDEX: fast lookup by owner + active status
// This is the ONLY lookup path used in the entire codebase
gmailTokenSchema.index({ crm_user_id: 1, is_active: 1 });

// UNIQUENESS: one ACTIVE token per CRM user (partial index)
// Partial filter means: only enforce uniqueness among is_active=true rows.
// This allows historical (is_active=false) rows to exist for the same user
// without causing a unique constraint violation on reconnect.
gmailTokenSchema.index(
  { crm_user_id: 1 },
  {
    unique: true,
    partialFilterExpression: { is_active: true },
    name: "unique_active_token_per_user",
  }
);

// NOTE: We intentionally do NOT index by email because:
//  1. No code should ever look up tokens by email.
//  2. Adding such an index would tempt future devs to do so.

const GmailToken = mongoose.model("GmailToken", gmailTokenSchema);
export default GmailToken;