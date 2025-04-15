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
  // lead: { type: String, required: true },  
  status: { type: String, enum: ["paid", "unpaid"], required: true },
  items: [
    {
      deal: { type: String, required: true },
      quantity: { type: Number, required: true },
      price: { type: Number },
      amount: { type: Number },
    },
  ],
  note: { type: String },  // Ensure the backend can store the note
  tax: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  total: { type: Number, required: true },
});

const Invoice = mongoose.model("Invoice", invoiceSchema);
export default Invoice;

