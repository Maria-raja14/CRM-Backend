// import mongoose from "mongoose";

// const templateSchema = new mongoose.Schema(
//   {
//     title: { type: String, required: true },
//     content: { type: String, required: true },
//     image: { type: String }, // Stores image URL or path
//   },
//   { timestamps: true }
// );

// const Temp = mongoose.model("Template", templateSchema);
// export default Temp;

import mongoose from "mongoose";

const templateSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    image: { type: String },
    type: { type: String, enum: ["custom", "predefined"], default: "custom" },
    owner: { type: String, default: "User" }
  },
  { timestamps: true }
);

const Temp = mongoose.model("Template", templateSchema);
export default Temp;