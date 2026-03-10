
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

// ─────────────────────────────────────────────────────────────────────────────
// GmailToken schema
//
// Security model:
//   • crm_user_id  – links this token to exactly one CRM user (required).
//   • The compound unique index on (email + crm_user_id) means one CRM user
//     can only have one active token per Gmail address, but two different CRM
//     users can each connect the same Gmail address independently (each gets
//     their own row, their own is_active flag).
//   • All service-layer queries filter by BOTH email AND crm_user_id so that
//     user A can never touch user B's token even if they know the email.
// ─────────────────────────────────────────────────────────────────────────────
const gmailTokenSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },

  // REQUIRED – every token must be owned by a CRM user.
  crm_user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
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

// Compound unique index: one record per (email, crm_user_id) pair.
// This replaces the old unique index on email alone.
gmailTokenSchema.index({ email: 1, crm_user_id: 1 }, { unique: true });

// Fast lookup by CRM user + active flag (used on every authenticated request).
gmailTokenSchema.index({ crm_user_id: 1, is_active: 1 });

gmailTokenSchema.pre("save", function (next) {
  this.updated_at = new Date();
  next();
});

// ── Migration guard ───────────────────────────────────────────────────────────
// On startup, drop the old unique index on `email` alone if it exists, so the
// new compound index takes over without a startup error.
mongoose.connection.once("open", async () => {
  try {
    const collection = mongoose.connection.collection("gmailtokens");
    const indexes = await collection.indexes();

    // Find any index that is unique, covers only the `email` field, and is NOT
    // our new compound index.
    const oldEmailIndex = indexes.find(
      (idx) =>
        idx.unique === true &&
        idx.key &&
        Object.keys(idx.key).length === 1 &&
        idx.key.email !== undefined
    );

    if (oldEmailIndex) {
      await collection.dropIndex(oldEmailIndex.name);
      console.log("✅ Dropped old unique-email index from gmailtokens collection");
    }
  } catch (err) {
    // Index may not exist on a fresh install – that is fine.
    console.log("ℹ️  GmailToken index migration (no action needed):", err.message);
  }
});

const GmailToken = mongoose.model("GmailToken", gmailTokenSchema);
export default GmailToken;