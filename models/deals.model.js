


import mongoose from "mongoose";

const dealSchema = new mongoose.Schema({
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", required: true },
  dealTitle:{ type:String,require:true},
  dealName: { type: String, required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  value: { type: Number }, // optional: deal value
  stage: {
    type: String,
    enum: ["Qualification", "Negotiation", "Proposal Sent", "Closed Won", "Closed Lost"],
    default: "Qualification",
  },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Update `updatedAt` before saving
dealSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

const Deal = mongoose.model("Deal", dealSchema);
export default Deal;
