import mongoose from "mongoose";

const leadSchema = new mongoose.Schema(
  {
    leadName: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    email: { type: String },
    source: { type: String }, // Instagram, Referral, Website...
    companyName: { type: String },
    industry: { type: String },
    requirement: { type: String },
    status: {
      type: String,
      enum: ["New", "Follow-up", "Converted", "Closed"],
      default: "New",
    },
    assignTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    address: { type: String },
    priorityLevel: {
      type: String,
      enum: ["Hot", "Warm", "Cold", "Junk"],
      default: "Cold",
    },
    followUpDate: { type: Date },
    leadStatus: { type: String, default: "Lead" }, // "Lead" or "Deal"
    notes: { type: String },
  },
  { timestamps: true } // createdAt & updatedAt
);

const Lead = mongoose.model("Lead", leadSchema);
export default Lead;
