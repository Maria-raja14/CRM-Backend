// models/leads.model.js

import mongoose from "mongoose";
import Notification from "./notification.model.js";
import { notifyUser } from "../realtime/socket.js";

const leadSchema = new mongoose.Schema(
  {
    leadName:    { type: String, required: true },
    phoneNumber: { type: String, required: true },
    email:       { type: String },
    source:      { type: String },
    destination: { type: String, required: true },
    duration:    { type: String },
    requirement: { type: String },
    assignTo:    { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    address:     { type: String },
    country:     { type: String },

    // ✅ KEY FIX: default MUST be undefined (not null) for sparse unique index to work.
    // When facebookLeadId is undefined/not set, MongoDB sparse index ignores the document.
    // When facebookLeadId is null, MongoDB treats it as a value and unique constraint fires.
    facebookLeadId: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     "FacebookForm",
      default: undefined,   // ← was: null  (that caused E11000 on manual leads)
      sparse:  true,        // ← inline sparse hint (belt-and-suspenders)
    },

    // noOfTravellers: { type: Number, default: null },
        noOfAdults:   { type: Number, default: null },
    noOfChildren: { type: Number, default: null },
    travelDate:     { type: Date,   default: null },

    status: {
      type:    String,
      enum:    ["Hot", "Warm", "Cold", "Junk", "Converted"],
      default: "Cold",
    },

    followUpDate:     { type: Date,    default: null },
    emailSentAt:      { type: Date,    default: null },
    lastReminderAt:   { type: Date,    default: null },
    followUpNotified: { type: Boolean, default: false },

    notes: { type: String },

    attachments: [
      {
        name:       { type: String, required: true },
        path:       { type: String, required: true },
        type:       { type: String },
        size:       { type: Number },
        uploadedAt: { type: Date, default: () => new Date() },
      },
    ],
  },
  { timestamps: true }
);

// ─── Indexes ───────────────────────────────────────────────────────────────────
leadSchema.index({ followUpDate: 1 });
leadSchema.index({ status: 1, lastReminderAt: 1 });

// ✅ Sparse unique index — only enforces uniqueness when facebookLeadId is present.
//    Documents where facebookLeadId is undefined are excluded from this index entirely.
leadSchema.index(
  { facebookLeadId: 1 },
  { unique: true, sparse: true }
);

// ─── Hooks ────────────────────────────────────────────────────────────────────

leadSchema.post("findOneAndDelete", async function (doc) {
  if (!doc) return;

  const leadId = doc._id.toString();

  const deletedNotifications = await Notification.find({
    "meta.leadId": leadId,
  }).lean();

  await Notification.deleteMany({ "meta.leadId": leadId });

  const map = new Map();
  deletedNotifications.forEach((n) => {
    if (!map.has(n.userId)) map.set(n.userId, []);
    map.get(n.userId).push(n._id.toString());
  });

  for (const [userId, ids] of map.entries()) {
    notifyUser(userId, "notification_deleted", { ids });
  }
});

leadSchema.post(
  "deleteOne",
  { document: true, query: false },
  async function () {
    const leadId = this._id.toString();

    const deletedNotifications = await Notification.find({
      "meta.leadId": leadId,
    }).lean();

    await Notification.deleteMany({ "meta.leadId": leadId });

    const map = new Map();
    deletedNotifications.forEach((n) => {
      if (!map.has(n.userId)) map.set(n.userId, []);
      map.get(n.userId).push(n._id.toString());
    });

    for (const [userId, ids] of map.entries()) {
      notifyUser(userId, "notification_deleted", { ids });
    }
  }
);

const Lead = mongoose.model("Lead", leadSchema);
export default Lead;