import mongoose from "mongoose";

const dealSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Name of the deal
});

// export default mongoose.model("Deal", dealSchema);
const deal = mongoose.model("Deal", dealSchema);
export default deal;


