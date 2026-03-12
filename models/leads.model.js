

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


import mongoose from "mongoose";

const leadSchema = new mongoose.Schema(
  {
    leadName: { type: String, required: true },

    phoneNumber: { type: String, required: true },

    email: { type: String },

    source: { type: String },

    designation: { type: String, required: true },

    duration: { type: String },

    requirement: { type: String },

    assignTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    address: { type: String },

    country: { type: String },

    status: {
      type: String,
      enum: ["Hot", "Warm", "Cold", "Junk", "Converted"],
      default: "Cold",
    },

    followUpDate: {
      type: Date,
      default: Date.now,
    },

    emailSentAt: {
      type: Date,
      default: null,
    },

    lastReminderAt: {
      type: Date,
      default: null,
    },

    // ✅ NEW FIELD (Prevents duplicate notifications)
    followUpNotified: {
      type: Boolean,
      default: false,
    },

    notes: { type: String },

    attachments: [
      {
        name: { type: String, required: true },

        path: { type: String, required: true },

        type: { type: String },

        size: { type: Number },

        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

// index for faster follow-up queries
leadSchema.index({ followUpDate: 1 });

const Lead = mongoose.model("Lead", leadSchema);

export default Lead;