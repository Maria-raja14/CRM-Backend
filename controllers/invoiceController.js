import Invoice from "../models/invoiceModel.js";

export default {
  // ✅ Create Invoice
  createInvoice: async (req, res) => {
    console.log("Received invoice data:", req.body); // Log the received data
  
    try {
      const invoice = new Invoice(req.body); // Check if required fields are missing
      await invoice.save();
      res.status(201).json(invoice);
    } catch (error) {
      res.status(400).json({ error: error.message }); // Return the error message
    }
  },
  
  
  


  // ✅ Get All Invoices
  getAllInvoices: async (req, res) => {
    try {
      // const invoices = await Invoice.find().populate("owner items.deal");
      const invoices = await Invoice.find().populate("owner").populate("items.deal");

      console.log(invoices);
      
      res.status(200).json(invoices);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // ✅ Get Invoice by ID
  getInvoiceById: async (req, res) => {
    try {
      const invoice = await Invoice.findById(req.params.id).populate(
        "owner items.deal"
      );
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.status(200).json(invoice);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // ✅ Update Invoice
  updateInvoice: async (req, res) => {
    try {
      const updatedInvoice = await Invoice.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
          new: true,
          runValidators: true,
        }
      );
      if (!updatedInvoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.status(200).json(updatedInvoice);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // ✅ Delete Invoice
  deleteInvoice: async (req, res) => {
    try {
      const deletedInvoice = await Invoice.findByIdAndDelete(req.params.id);
      if (!deletedInvoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.status(200).json({ message: "Invoice deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};
