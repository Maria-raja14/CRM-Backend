import mongoose from "mongoose";

const dealSchema = new mongoose.Schema({
  leadId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Lead" 
  },
  dealTitle: { 
    type: String 
  },
  dealName: { 
    type: String, 
    required: true 
  },
  assignedTo: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  },
  value: { 
    type: String, 
    required: true 
  },
  currency: { 
    type: String, 
    default: "INR" 
  },
  discountGiven: {  // ✅ Keep only ONE discountGiven field
    type: Number, 
    default: 0,
    min: 0,
    max: 100 
  },
  stage: {
    type: String,
    enum: [
      "Qualification",
      "Proposal Sent-Negotiation",
      "Invoice Sent",
      "Closed Won",
      "Closed Lost",
    ],
    default: "Qualification",
  },
  notes: { 
    type: String 
  },
  phoneNumber: { 
    type: String 
  },
  email: { 
    type: String 
  },
  source: { 
    type: String 
  },
  companyName: { 
    type: String,
    index: true 
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    index: true
  },
  companySize: {
    type: String,
    enum: ["Small", "Medium", "Large", "Enterprise"],
    default: "Medium"
  },
  industry: { 
    type: String,
    index: true 
  },
  requirement: { 
    type: String 
  },
  address: { 
    type: String 
  },
  country: { 
    type: String 
  },
  attachments: [
    {
      name: String,
      path: String,
      type: String,
    },
  ],
  // Lost deal fields
  lossReason: {
    type: String,
    default: ""
  },
  lossNotes: {
    type: String,
    default: ""
  },
  stageLostAt: {
    type: String,
    default: null
  },
  lostDate: {
    type: Date,
    default: null
  },
  wonAt: {
    type: Date,
    index: true
  },
  wonBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  clientReviewId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ClientReview",
  },
  // Follow-up fields
  followUpDate: {
    type: Date,
    default: null,
    index: true
  },
  followUpComment: {
    type: String,
    default: ''
  },
  followUpHistory: [
    {
      date: { type: Date, default: Date.now },
      followUpDate: { type: Date },
      followUpComment: { type: String },
      changedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User" 
      },
      action: { 
        type: String, 
        enum: ["Created", "Updated", "Completed", "Cancelled", "Rescheduled"] 
      }
    }
  ],
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
  // Add this field to your dealSchema
lastReminderAt: {
  type: Date,
  default: null,
  index: true
}
});

// Update `updatedAt` before saving
dealSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// Indexes
dealSchema.index({ companyName: 1 });
dealSchema.index({ companyId: 1 });
dealSchema.index({ stage: 1 });
dealSchema.index({ industry: 1 });

const Deal = mongoose.model("Deal", dealSchema);
export default Deal;