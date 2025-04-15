import Invoice from "../models/invoiceModel.js";
import mongoose from 'mongoose';
import path from 'path';
import ejs from 'ejs';
import fs from "fs";
import puppeteer from 'puppeteer';

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
      const invoices = await Invoice.find()
        .populate("owner")
        .populate("items.deal");

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

 generateInvoicePDF: async (req, res) => {
    try {
      const invoiceId = req.params.id;

      console.log("Received Invoice ID:", invoiceId, "Type:", typeof invoiceId);

      if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
        return res.status(400).json({ error: "Invalid invoice ID format" });
      }

      const invoice = await Invoice.findById(invoiceId)
        .populate("owner")
        .populate("items.deal");

      console.log("Fetched Invoice:", invoice);

      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      // Load EJS template
      const templatePath = path.join(process.cwd(), "views", "invoiceTemplate.ejs");

      if (!fs.existsSync(templatePath)) {
        return res.status(500).json({ error: "Template file not found" });
      }

      const templateData = await ejs.renderFile(templatePath, { invoice });

      // Launch Puppeteer
      const browser = await puppeteer.launch({
        headless: "new", // Fix for headless mode warnings
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      const page = await browser.newPage();
      await page.setContent(templateData, { waitUntil: "networkidle0" });

      const pdfBuffer = await page.pdf({ format: "A4" });

      await browser.close();

      // Send the PDF file
      res.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=Invoice_${invoice.invoicenumber}.pdf`,
      });

      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error generating PDF:", error);
      res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
  },
  
};
