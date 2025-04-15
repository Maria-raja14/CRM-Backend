// import mongoose from "mongoose";

// const ExpenseSchema = new mongoose.Schema({
//   name: { type: String, required: true },
//   areaOfExpense: { type: String, required: true },
//   amount: { type: Number, required: true },
//   expenseDate: { type: Date, required: true },
//   description: { type: String },
//   attachments: { type: String },
//   createdBy: { type: String, required: true },
// }, { timestamps: true });

// const Expense = mongoose.model("Expense", ExpenseSchema);

// export default Expense;

import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
  {
    name: String,
    areaOfExpense: String,
    amount: Number,
    expenseDate: Date,
    description: String,
    attachments: [String],
    createdBy: String,
  },
  { timestamps: true }
);

export default mongoose.model("Expense", expenseSchema);
