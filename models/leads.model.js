import mongoose from "mongoose";

const leadSchema = new mongoose.Schema(
  {
    leadName: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    email: { type: String },
    source: { type: String },
    companyName: { type: String, required: true },
    industry: { type: String },
    requirement: { type: String },

    assignTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    address: { type: String },
    country: { type: String }, // 🔹 Added field

    status: {
      type: String,
      enum: ["Hot", "Warm", "Cold", "Junk", "Converted"],
      default: "Cold",
    },

    // next follow-up trigger
    followUpDate: { type: Date },

    emailSentAt: { type: Date, default: null }, // Track email send time
    lastReminderAt: { type: Date, default: null }, // Already exists

    notes: { type: String },
    attachments: [{ type: String }],
  },
  { timestamps: true }
);

// For scanning follow-ups quickly
leadSchema.index({ followUpDate: 1 });

const Lead = mongoose.model("Lead", leadSchema);
export default Lead;
