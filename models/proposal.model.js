

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
//       enum: ["draft", "sent", "no reply", "rejection", "success"],
//       default: "draft", // Changed default to draft
//     },
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
      ref: "Deal",       // Reference to your Deal model
      required: true 
    },
    email: { type: String, required: true },
    content: { type: String, required: true },
    image: { type: String },
    status: {
      type: String,
      enum: ["draft", "sent", "no reply", "rejection", "success"],
      default: "draft",
    },
  },
  { timestamps: true }
);

const Proposal = mongoose.model("Proposal", ProposalSchema);

export default Proposal;
