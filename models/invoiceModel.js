import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema({
  invoicenumber: {
    type: String,
    required: true,
    unique: true, //Ensure the invoice number is unique
    default: () => `INV-${Math.floor(Math.random() * 1000000)}`,
  },
  owner: { type: String, required: true },
  issueDate: { type: Date, required: true },
  dueDate: { type: Date, required: true },
  lead: { type: String, required: true },
  status: { type: String, enum: ["paid", "unpaid"], required: true },
  items: [
    {
      deal: { type: String, required: true },
      quantity: { type: Number, required: true },
      price: { type: Number },
      amount: { type: Number },
    },
  ],
  tax: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  total: { type: Number, required: true },
});

const Invoice = mongoose.model("Invoice", invoiceSchema);
export default Invoice;

// import mongoose from "mongoose";

// const invoiceSchema = new mongoose.Schema({
//   //   owner: { type: mongoose.Schema.Types.ObjectId, ref: "Owner", required: true }, // Reference Owner
//   owner: { type: String, required: true },
//   issueDate: { type: Date, required: true },
//   dueDate: { type: Date, required: true },
//   status: { type: String, enum: ["paid", "unpaid"], required: true },
//   items: [
//     {
//       deal:{ type: String, required: true }, // Reference Deal
//       quantity: { type: Number, required: true },
//       price: Number,
//       amount: Number,
//     },
//   ],
//   tax: { type: Number, default: 0 },
//   discount: { type: Number, default: 0 },
//   total: { type: Number, required: true },
// });
// const Invoice = mongoose.model("Invoice", invoiceSchema);
// export default Invoice;

// import mongoose from "mongoose";

// const invoiceSchema = new mongoose.Schema({
//   owner: { type: String, required: true },
//   issueDate: { type: Date, required: true },
//   dueDate: { type: Date, required: true },
//   status: { type: String, enum: ["paid", "unpaid"], required: true },
//   items: [
//     {
//       deal: String,
//       quantity: Number,
//       price: Number,
//       amount: Number,
//     },
//   ],
//   tax: { type: Number, default: 0 },
//   discount: { type: Number, default: 0 },
//   total: { type: Number, required: true },
// });

// const Invoice = mongoose.model("Invoice", invoiceSchema);
// export default Invoice;
