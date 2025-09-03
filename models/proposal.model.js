// import mongoose from "mongoose";

// const ProposalSchema = new mongoose.Schema(
//   {
//     title: { type: String, required: true },
//     deal: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Deal",
//       required: false,
//     },
//     dealTitle: { type: String, required: true }, // store deal name separately
//     email: { type: String, required: true },
//     cc: { type: String },
//     content: { type: String, required: false, default: "" },

//     image: { type: String },
//     status: {
//       type: String,
//       enum: ["draft", "sent", "no reply", "rejection", "success"],
//       default: "draft",
//     },
//     followUpDate: { type: Date },   // ✅ when follow-up should happen
//     followUpComment: { type: String }, // ✅ salesman notes
//     lastReminderAt: { type: Date }, // ✅ to avoid duplicate mail
//   },
//   { timestamps: true }
// );

// const Proposal = mongoose.model("Proposal", ProposalSchema);

// export default Proposal;

import mongoose from "mongoose";

const ProposalSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    deal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Deal",
      required: false,
    },
    dealTitle: { type: String, required: true },
    email: { type: String, required: true },
    cc: { type: String },
    content: { type: String, required: false, default: "" },
    image: { type: String },

    status: {
      type: String,
      enum: ["draft", "sent", "no reply", "rejection", "success"],
      default: "draft",
    },

    followUpDate: { type: Date, default: Date.now }, // 📅 follow-up date
    followUpComment: { type: String, default: "" }, // 📝 comment

    lastReminderAt: { type: Date }, // avoid duplicate reminders
     attachments: [
      {
        filename: String,
        path: String, // file path if you store in disk
        mimetype: String,
      },
    ],
  },
  { timestamps: true }
);

const Proposal = mongoose.model("Proposal", ProposalSchema);

export default Proposal;
