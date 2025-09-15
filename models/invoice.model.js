// import mongoose from "mongoose";

// const invoiceSchema = new mongoose.Schema({
//   invoicenumber: {
//     type: String,
//     required: true,
//     unique: true, // Ensure the invoice number is unique
//     default: () => `TZI-${Math.floor(Math.random() * 1000000)}`,
//   },
//   assignTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
//   issueDate: { type: Date, required: true },
//   dueDate: { type: Date, required: true },
//   status: { type: String, enum: ["paid", "unpaid","send"], required: true },
//   items: [
//     {
//       deal: { 
//         type: mongoose.Schema.Types.ObjectId, 
//         ref: "Deal", // Reference to Deal table
//         required: true 
//       },
//       price: { type: Number },
//       amount: { type: Number },
//     },
//   ],
//   note: { type: String }, // Ensure the backend can store the note
//   tax: { type: Number, default: 0 },
//   discount: { type: Number, default: 0 },
//   total: { type: Number, required: true },
// }, { timestamps: true }); // optional: adds createdAt/updatedAt

// const Invoice = mongoose.model("Invoice", invoiceSchema);
// export default Invoice;


import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema({
  invoicenumber: {
    type: String,
    required: true,
    unique: true,
    default: () => `TZI-${Math.floor(Math.random() * 1000000)}`,
  },
  assignTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  issueDate: { type: Date, required: true },
  dueDate: { type: Date, required: true },
  status: { type: String, enum: ["paid", "unpaid", "send"], required: true },

  items: [
    {
      deal: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Deal", 
        required: true 
      },
      price: { type: Number, required: true },
      amount: { type: Number, required: true }, // price itself or pre-calculated
    },
  ],

  note: { type: String },

  // Store calculated amounts
  subtotal: { type: Number, required: true },
  discount: { type: Number, default: 0 }, // actual discount amount
  tax: { type: Number, default: 0 },      // actual tax amount
  total: { type: String, required: true },

  // Store original input values
  discountValue: { type: Number, default: 0 }, // percentage or fixed
  discountType: { type: String, enum: ["percentage","fixed"], default: "percentage" },
  taxValue: { type: Number, default: 0 }, // percentage or fixed
  taxType: { type: String, enum: ["percentage","fixed"], default: "percentage" },

  currency: { type: String, default: "USD" },
}, { timestamps: true });

const Invoice = mongoose.model("Invoice", invoiceSchema);
export default Invoice;
