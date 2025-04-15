import mongoose from "mongoose";

const AreaExpenseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
});

export default mongoose.model("AreaExpense", AreaExpenseSchema);
