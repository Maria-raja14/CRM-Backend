

// import mongoose from "mongoose";

// const leadSchema = new mongoose.Schema(
//   {
//     leadName:    { type: String, required: true },
//     phoneNumber: { type: String, required: true },
//     email:       { type: String },
//     source:      { type: String },               // can be predefined or custom text
//     designation: { type: String, required: true }, // renamed from companyName
//     duration:    { type: String },                // replaces industry field
//     requirement: { type: String },

//     assignTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

//     address: { type: String },
//     country: { type: String },

//     status: {
//       type: String,
//       enum: ["Hot", "Warm", "Cold", "Junk", "Converted"],
//       default: "Cold",
//     },

//     followUpDate: { type: Date, default: Date.now },

//     emailSentAt:    { type: Date, default: null },
//     lastReminderAt: { type: Date, default: null },

//     notes: { type: String },

//     attachments: [
//       {
//         name:       { type: String, required: true },
//         path:       { type: String, required: true },
//         type:       { type: String },
//         size:       { type: Number },
//         uploadedAt: { type: Date, default: Date.now },
//       },
//     ],
//   },
//   { timestamps: true }
// );

// leadSchema.index({ followUpDate: 1 });

// const Lead = mongoose.model("Lead", leadSchema);
// export default Lead;//original


// import mongoose from "mongoose";

// const leadSchema = new mongoose.Schema(
//   {
//     leadName: { type: String, required: true },

//     phoneNumber: { type: String, required: true },

//     email: { type: String },

//     source: { type: String },

//     designation: { type: String, required: true },

//     duration: { type: String },

//     requirement: { type: String },

//     assignTo: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//     },

//     address: { type: String },

//     country: { type: String },

//     status: {
//       type: String,
//       enum: ["Hot", "Warm", "Cold", "Junk", "Converted"],
//       default: "Cold",
//     },

//     followUpDate: {
//       type: Date,
//       default: Date.now,
//     },

//     emailSentAt: {
//       type: Date,
//       default: null,
//     },

//     lastReminderAt: {
//       type: Date,
//       default: null,
//     },

//     // ✅ NEW FIELD (Prevents duplicate notifications)
//     followUpNotified: {
//       type: Boolean,
//       default: false,
//     },

//     notes: { type: String },

//     attachments: [
//       {
//         name: { type: String, required: true },

//         path: { type: String, required: true },

//         type: { type: String },

//         size: { type: Number },

//         uploadedAt: {
//           type: Date,
//           default: Date.now,
//         },
//       },
//     ],
//   },
//   { timestamps: true }
// );

// // index for faster follow-up queries
// leadSchema.index({ followUpDate: 1 });

// const Lead = mongoose.model("Lead", leadSchema);

// export default Lead;


// import mongoose from "mongoose";
// import Notification from "./notification.model.js";

// const leadSchema = new mongoose.Schema(
//   {
//     leadName: { type: String, required: true },

//     phoneNumber: { type: String, required: true },

//     email: { type: String },

//     source: { type: String },

//     designation: { type: String, required: true },

//     duration: { type: String },

//     requirement: { type: String },

//     assignTo: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//     },

//     address: { type: String },

//     country: { type: String },

//     status: {
//       type: String,
//       enum: ["Hot", "Warm", "Cold", "Junk", "Converted"],
//       default: "Cold",
//     },

//     followUpDate: {
//       type: Date,
//       default: Date.now,
//     },

//     emailSentAt: {
//       type: Date,
//       default: null,
//     },

//     lastReminderAt: {
//       type: Date,
//       default: null,
//     },

//     followUpNotified: {
//       type: Boolean,
//       default: false,
//     },

//     notes: { type: String },

//     attachments: [
//       {
//         name: { type: String, required: true },
//         path: { type: String, required: true },
//         type: { type: String },
//         size: { type: Number },
//         uploadedAt: { type: Date, default: Date.now },
//       },
//     ],
//   },
//   { timestamps: true }
// );

// leadSchema.index({ followUpDate: 1 });

// /*
// |--------------------------------------------------------------------------
// | 🔴 Delete notifications when lead deleted
// |--------------------------------------------------------------------------
// */

// leadSchema.post("findOneAndDelete", async function (doc) {
//   if (doc) {
//     await mongoose.model("Notification").deleteMany({
//       "meta.leadId": doc._id.toString(),
//     });
//   }
// });

// leadSchema.post("deleteOne", { document: true, query: false }, async function () {
//   await mongoose.model("Notification").deleteMany({
//     "meta.leadId": this._id.toString(),
//   });
// });

// const Lead = mongoose.model("Lead", leadSchema);

// export default Lead;


// import mongoose from "mongoose";
// import Notification from "./notification.model.js";
// import { notifyUser } from "../realtime/socket.js"; // <-- import socket helper

// const leadSchema = new mongoose.Schema(
//   {
//     leadName: { type: String, required: true },
//     phoneNumber: { type: String, required: true },
//     email: { type: String },
//     source: { type: String },
//     // designation: { type: String, required: true },
//      destination: { type: String, required: true }, // renamed from designation
//     duration: { type: String },
//     requirement: { type: String },
//     assignTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
//     address: { type: String },
//     country: { type: String },
//     status: {
//       type: String,
//       enum: ["Hot", "Warm", "Cold", "Junk", "Converted"],
//       default: "Cold",
//     },
//     followUpDate: { type: Date, default: Date.now },
//     emailSentAt: { type: Date, default: null },
//     lastReminderAt: { type: Date, default: null },
//     followUpNotified: { type: Boolean, default: false },
//     notes: { type: String },
//     attachments: [
//       {
//         name: { type: String, required: true },
//         path: { type: String, required: true },
//         type: { type: String },
//         size: { type: Number },
//         uploadedAt: { type: Date, default: Date.now },
//       },
//     ],
//   },
//   { timestamps: true }
// );

// leadSchema.index({ followUpDate: 1 });

// /*
// |--------------------------------------------------------------------------
// | 🔴 Delete notifications when lead deleted – and emit socket event
// |--------------------------------------------------------------------------
// */

// leadSchema.post("findOneAndDelete", async function (doc) {
//   if (doc) {
//     // Find all notifications that will be deleted
//     const deletedNotifications = await Notification.find({
//       "meta.leadId": doc._id.toString(),
//     }).lean();

//     // Delete them
//     await Notification.deleteMany({
//       "meta.leadId": doc._id.toString(),
//     });

//     // Group deleted notifications by userId and emit event
//     const userNotificationMap = new Map();
//     deletedNotifications.forEach((notif) => {
//       if (!userNotificationMap.has(notif.userId)) {
//         userNotificationMap.set(notif.userId, []);
//       }
//       userNotificationMap.get(notif.userId).push(notif._id.toString());
//     });

//     for (const [userId, notifIds] of userNotificationMap.entries()) {
//       notifyUser(userId, "notification_deleted", { ids: notifIds });
//     }
//   }
// });

// leadSchema.post("deleteOne", { document: true, query: false }, async function () {
//   const leadId = this._id.toString();

//   // Find notifications linked to this lead
//   const deletedNotifications = await Notification.find({
//     "meta.leadId": leadId,
//   }).lean();

//   // Delete them
//   await Notification.deleteMany({
//     "meta.leadId": leadId,
//   });

//   // Group and emit
//   const userNotificationMap = new Map();
//   deletedNotifications.forEach((notif) => {
//     if (!userNotificationMap.has(notif.userId)) {
//       userNotificationMap.set(notif.userId, []);
//     }
//     userNotificationMap.get(notif.userId).push(notif._id.toString());
//   });

//   for (const [userId, notifIds] of userNotificationMap.entries()) {
//     notifyUser(userId, "notification_deleted", { ids: notifIds });
//   }
// });

// const Lead = mongoose.model("Lead", leadSchema);

// export default Lead;//notification come correctly..


import mongoose from "mongoose";
import Notification from "./notification.model.js";
import { notifyUser } from "../realtime/socket.js";

const leadSchema = new mongoose.Schema(
  {
    leadName:    { type: String, required: true },
    phoneNumber: { type: String, required: true },
    email:       { type: String },
    source:      { type: String },
    destination: { type: String, required: true }, // renamed from designation
    duration:    { type: String },
    requirement: { type: String },
    assignTo:    { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    address:     { type: String },
    country:     { type: String },
    status: {
      type:    String,
      enum:    ["Hot", "Warm", "Cold", "Junk", "Converted"],
      default: "Cold",
    },
    // ✅ FIX: Use arrow function so default is evaluated at insert time, not schema-load time
    followUpDate:     { type: Date, default: () => new Date() },
    emailSentAt:      { type: Date, default: null },
    lastReminderAt:   { type: Date, default: null },
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
leadSchema.index({ status: 1, lastReminderAt: 1 }); // speeds up cron query

// Cascade-delete notifications when a lead is hard-deleted
leadSchema.post("findOneAndDelete", async function (doc) {
  if (!doc) return;

  const deletedNotifications = await Notification.find({
    "meta.leadId": doc._id.toString(),
  }).lean();

  await Notification.deleteMany({ "meta.leadId": doc._id.toString() });

  const map = new Map();
  deletedNotifications.forEach((n) => {
    if (!map.has(n.userId)) map.set(n.userId, []);
    map.get(n.userId).push(n._id.toString());
  });

  for (const [userId, ids] of map.entries()) {
    notifyUser(userId, "notification_deleted", { ids });
  }
});

leadSchema.post("deleteOne", { document: true, query: false }, async function () {
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
});

const Lead = mongoose.model("Lead", leadSchema);
export default Lead;