// import mongoose from "mongoose";

// const ProposalSchema = new mongoose.Schema(
//   {
//     title: { type: String, required: true },
//     dealTitle: { type: String, required: true },
//     email: { type: String, required: true },
//     content: { type: String, required: true },
//     image: { type: String },
//     status: {
//       type: String,
//       enum: ["send", "draft", "no reply", "rejection", "success"], // Allowed values
//       default: "draft", // Default status when creating a proposal
//     },
//     stage: {
//       type: String,
//       enum: ["draft", "send", "no reply", "rejection", "success"],
//       default: "draft",
//     },
    
//   },
//   { timestamps: true }
// );

// const Proposal = mongoose.model("Proposal", ProposalSchema);

// export default Proposal;//original


import mongoose from "mongoose";

const ProposalSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    dealTitle: { type: String, required: true },
    email: { type: String, required: true },
    content: { type: String, required: true },
    image: { type: String },
    status: {
      type: String,
      enum: ["draft", "sent", "no reply", "rejection", "success"],
      default: "sent",
    },
  },
  { timestamps: true }
);

const Proposal = mongoose.model("Proposal", ProposalSchema);

export default Proposal;