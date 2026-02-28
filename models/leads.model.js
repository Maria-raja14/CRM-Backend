


import mongoose from "mongoose";

const leadSchema = new mongoose.Schema(
  {
    leadName:    { type: String, required: true },
    phoneNumber: { type: String, required: true },
    email:       { type: String },
    source:      { type: String },
    companyName: { type: String, required: true },
    industry:    { type: String },
    requirement: { type: String },

    assignTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    address: { type: String },
    country: { type: String },

    status: {
      type: String,
      enum: ["Hot", "Warm", "Cold", "Junk", "Converted"],
      default: "Cold",
    },

    // Follow-up defaults to creation date
    followUpDate: { type: Date, default: Date.now },

    emailSentAt:    { type: Date, default: null },
    lastReminderAt: { type: Date, default: null },

    notes: { type: String },

    attachments: [
      {
        name:       { type: String, required: true }, // original file name
        path:       { type: String, required: true }, // relative path e.g. "uploads/leads/xyz.pdf"
        type:       { type: String },                 // MIME type
        size:       { type: Number },                 // bytes
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

leadSchema.index({ followUpDate: 1 });

const Lead = mongoose.model("Lead", leadSchema);
export default Lead;