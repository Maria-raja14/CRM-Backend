// models/Call.model.js
import mongoose from "mongoose";

const CallSchema = new mongoose.Schema(
  {
    // Twilio Call SID
    callSid: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // Direction: inbound | outbound-dial | outbound-api
    direction: {
      type: String,
      enum: ["inbound", "outbound-dial", "outbound-api", "outbound"],
      required: true,
    },

    // From number (caller)
    from: {
      type: String,
      required: true,
      trim: true,
    },

    // To number (recipient)
    to: {
      type: String,
      required: true,
      trim: true,
    },

    // Call status: queued | ringing | in-progress | completed | busy | no-answer | canceled | failed
    status: {
      type: String,
      default: "ringing",
      trim: true,
    },

    // Duration in seconds
    duration: {
      type: Number,
      default: 0,
    },

    // Recording URL (if enabled)
    recordingUrl: {
      type: String,
      default: "",
    },

    // Recording SID
    recordingSid: {
      type: String,
      default: "",
    },

    // Recording duration
    recordingDuration: {
      type: Number,
      default: 0,
    },

    // Caller name (if available from Twilio)
    callerName: {
      type: String,
      default: "",
    },

    // Which CRM user answered / made the call (optional)
    handledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Linked CRM contact / lead (optional, set manually)
    crmContactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contact",
      default: null,
    },

    // Start time of the call
    startTime: {
      type: Date,
      default: null,
    },

    // End time of the call
    endTime: {
      type: Date,
      default: null,
    },

    // Extra metadata from Twilio
    accountSid: {
      type: String,
      default: "",
    },

    // Notes added by agent
    notes: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// Indexes for fast queries
CallSchema.index({ from: 1, createdAt: -1 });
CallSchema.index({ to: 1, createdAt: -1 });
CallSchema.index({ status: 1 });
CallSchema.index({ direction: 1, createdAt: -1 });

const Call = mongoose.model("Call", CallSchema);
export default Call;