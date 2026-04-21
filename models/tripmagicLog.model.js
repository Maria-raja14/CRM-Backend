// models/tripmagicLog.model.js
// Tracks which TripMagics Gmail message IDs have already been processed
// so we never create duplicate leads from the same email

import mongoose from "mongoose";

const tripmagicLogSchema = new mongoose.Schema(
  {
    gmailMessageId: {
      type:     String,
      required: true,
      unique:   true,
      index:    true,
    },
    gmailThreadId: {
      type: String,
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "Lead",
      default: null,
    },
    leadName: { type: String },
    email:    { type: String },
    phone:    { type: String },
    status: {
      type:    String,
      enum:    ["processed", "failed", "skipped"],
      default: "processed",
    },
    error:       { type: String },
    processedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

const TripmagicLog = mongoose.model("TripmagicLog", tripmagicLogSchema);
export default TripmagicLog;