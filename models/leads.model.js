
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


    facebookLeadId: {
      type:      mongoose.Schema.Types.ObjectId,
      ref:       "FacebookForm",    // references the FacebookForm collection
      default:   null,
      sparse:    true,              // allows multiple null values while keeping uniqueness
      unique:    true,              // ensures each Facebook lead is linked at most once
    },
    
    // ── NEW FIELDS ──
    noOfTravellers: { type: Number, default: null },
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
    notes:            { type: String },
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

leadSchema.index({ followUpDate: 1 });
leadSchema.index({ status: 1, lastReminderAt: 1 });

leadSchema.post("findOneAndDelete", async function (doc) {
  if (!doc) return;
  const deletedNotifications = await Notification.find({ "meta.leadId": doc._id.toString() }).lean();
  await Notification.deleteMany({ "meta.leadId": doc._id.toString() });
  const map = new Map();
  deletedNotifications.forEach((n) => {
    if (!map.has(n.userId)) map.set(n.userId, []);
    map.get(n.userId).push(n._id.toString());
  });
  for (const [userId, ids] of map.entries()) notifyUser(userId, "notification_deleted", { ids });
});

leadSchema.post("deleteOne", { document: true, query: false }, async function () {
  const leadId = this._id.toString();
  const deletedNotifications = await Notification.find({ "meta.leadId": leadId }).lean();
  await Notification.deleteMany({ "meta.leadId": leadId });
  const map = new Map();
  deletedNotifications.forEach((n) => {
    if (!map.has(n.userId)) map.set(n.userId, []);
    map.get(n.userId).push(n._id.toString());
  });
  for (const [userId, ids] of map.entries()) notifyUser(userId, "notification_deleted", { ids });
});

const Lead = mongoose.model("Lead", leadSchema);
export default Lead;//all work correctly..