// models/stage.js
import mongoose from "mongoose";

const StageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    proposals: [{ type: mongoose.Schema.Types.ObjectId, ref: "Proposal" }],
  },
  { timestamps: true }
);

const Stage = mongoose.model("Stage", StageSchema);
export default Stage;
