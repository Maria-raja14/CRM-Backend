import mongoose from "mongoose";

const templateSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    image: { type: String }, // Stores image URL or path
  },
  { timestamps: true }
);

const Temp = mongoose.model("Template", templateSchema);
export default Temp;
