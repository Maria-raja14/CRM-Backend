import Invoice from "../models/invoice.model.js";
import mongoose from "mongoose";
import path from "path";
import ejs from "ejs";
import fs from "fs";
import puppeteer from "puppeteer";
import nodemailer from "nodemailer";

export default {
  // ✅ Create Invoice
  createInvoice: async (req, res) => {
    try {
      let { items, tax = 0, discount = 0, ...rest } = req.body;

      if (!items || items.length === 0) {
        return res
          .status(400)
          .json({ error: "Invoice must contain at least one item" });
      }

      // Ensure numeric values and calculate amount
      items = items.map((item) => {
        const price = Number(item.price) || 0;
        const quantity = Number(item.quantity) || 1;
        const amount = price * quantity;
        return {
          ...item,
          amount: amount.toFixed(2), // store as string if you want, or Number(amount)
        };
      });

      const subtotal = items.reduce(
        (sum, item) => sum + Number(item.amount),
        0
      );

      // Ensure tax and discount are numbers
      const taxValue = Number(tax) || 0; // e.g., 5 for 5%
      const discountValue = Number(discount) || 0;

      // Apply discount first
      const discountedSubtotal = subtotal - discountValue;

      // Apply tax (% of discounted subtotal)
      const taxAmount = (discountedSubtotal * taxValue) / 100;

      const total = discountedSubtotal + taxAmount;

      const invoice = new Invoice({
        ...rest,
        items,
        tax: taxValue,
        discount: discountValue,
        subtotal,
        total: Number(total.toFixed(2)),
      });

      await invoice.save();

      // Populate before returning
      const populatedInvoice = await Invoice.findById(invoice._id)
        .populate("assignTo", "firstName lastName email")
        .populate("items.deal", "dealName requirement value stage");

      res.status(201).json(populatedInvoice);
    } catch (error) {
      console.error("Error creating invoice:", error);
      res.status(400).json({ error: error.message });
    }
  },



  // ✅ Get Invoice by ID
  getInvoiceById: async (req, res) => {
    try {
      const invoice = await Invoice.findById(req.params.id)
        .populate("assignTo", "firstName lastName email")
        .populate("items.deal", "dealName value stage");

      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.status(200).json(invoice);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

 // ✅ Get All Invoices with Pagination
getAllInvoices: async (req, res) => {
  try {
    let { page = 1, limit = 10 } = req.query;
    page = Number(page);
    limit = Number(limit);

    const totalCount = await Invoice.countDocuments();
    const invoices = await Invoice.find()
      .populate("assignTo", "firstName lastName email")
      .populate("items.deal", "dealName value stage")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({ invoices, totalCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
},

// ✅ Update Invoice (fixed quantity logic)
updateInvoice: async (req, res) => {
  try {
    let { items, tax = 0, discount = 0, ...rest } = req.body;

    if (items && items.length > 0) {
      items = items.map((item) => {
        const price = Number(item.price) || 0;
        const quantity = Number(item.quantity) || 1;
        const amount = price * quantity;
        return {
          ...item,
          amount: amount.toFixed(2),
        };
      });

      const subtotal = items.reduce(
        (sum, item) => sum + Number(item.amount),
        0
      );

      const taxValue = Number(tax) || 0;
      const discountValue = Number(discount) || 0;
      const discountedSubtotal = subtotal - discountValue;
      const taxAmount = (discountedSubtotal * taxValue) / 100;
      const total = discountedSubtotal + taxAmount;

      rest.items = items;
      rest.tax = taxValue;
      rest.discount = discountValue;
      rest.subtotal = subtotal;
      rest.total = Number(total.toFixed(2));
    }

    const updatedInvoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      rest,
      { new: true, runValidators: true }
    )
      .populate("assignTo", "firstName lastName email")
      .populate("items.deal", "dealName value stage");

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

      if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
        return res.status(400).json({ error: "Invalid invoice ID format" });
      }

      const invoice = await Invoice.findById(invoiceId)
        .populate("assignTo", "firstName lastName email")
        .populate("items.deal", "dealName value stage");

      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      const templatePath = path.join(
        process.cwd(),
        "views",
        "invoiceTemplate.ejs"
      );

      if (!fs.existsSync(templatePath)) {
        return res.status(500).json({ error: "Template file not found" });
      }

      // ✅ renderFile with try/catch
      const templateData = await ejs.renderFile(
        templatePath,
        { invoice },
        { async: true }
      );

      const browser = await puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      const page = await browser.newPage();

      await page.setContent(templateData, { waitUntil: "networkidle0" });

      // ✅ Add margin to avoid cut text
      const pdfBuffer = await page.pdf({
        format: "A4",
        margin: { top: "20mm", right: "10mm", bottom: "20mm", left: "10mm" },
        printBackground: true,
      });

      await browser.close();

      // ✅ Proper headers
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=Invoice_${invoice.invoicenumber}.pdf`
      );
      res.setHeader("Content-Length", pdfBuffer.length);

      return res.end(pdfBuffer); // safer than res.send
    } catch (error) {
      console.error("Error generating PDF:", error);
      res
        .status(500)
        .json({ error: "Internal Server Error", details: error.message });
    }
  },

  sendInvoiceEmail: async (req, res) => {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid invoice ID" });
      }

      const invoice = await Invoice.findById(id)
        .populate("assignTo", "firstName lastName email")
        .populate("items.deal", "dealName value stage");

      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      // Load invoice template (EJS -> HTML)
      const templatePath = path.join(
        process.cwd(),
        "views",
        "invoiceTemplate.ejs"
      );
      const templateData = await ejs.renderFile(templatePath, { invoice });

      // Generate PDF using Puppeteer
      const browser = await puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox"],
      });
      const page = await browser.newPage();
      await page.setContent(templateData, { waitUntil: "networkidle0" });
      const pdfBuffer = await page.pdf({ format: "A4" });
      await browser.close();

      // Setup Nodemailer
      const transporter = nodemailer.createTransport({
        service: "gmail", // or use SMTP settings
        auth: {
          user: process.env.EMAIL_USER, // your email
          pass: process.env.EMAIL_PASS, // your app password
        },
      });

      // Send Email
      const mailOptions = {
        from: `"Your Company" <${process.env.EMAIL_USER}>`,
        to: invoice.assignTo?.email || "default@email.com", // ✅ customer email
        subject: `Invoice #${invoice.invoicenumber}`,
        text: "Please find attached your invoice.",
        attachments: [
          {
            filename: `Invoice_${invoice.invoicenumber}.pdf`,
            content: pdfBuffer,
          },
        ],
      };

      await transporter.sendMail(mailOptions);

      res.status(200).json({ message: "Invoice sent successfully!" });
    } catch (error) {
      console.error("Error sending invoice email:", error);
      res.status(500).json({ error: "Failed to send invoice email" });
    }
  },
  // ➡️ Get Recent Invoices (last 5)
  getRecentInvoices: async (_req, res) => {
    try {
      const now = new Date();
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(now.getMonth() - 1);

      const invoices = await Invoice.find({
        createdAt: { $gte: oneMonthAgo, $lte: now }, // last 1 month filter
      })
        .sort({ createdAt: -1 }) // recent first
        .populate("assignTo", "firstName lastName email");

      res.status(200).json(invoices);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // ➡️ Get Pending Invoices (status = Unpaid / Pending)
  getPendingInvoices: async (_req, res) => {
    try {
      const invoices = await Invoice.find({ status: { $in: ["unpaid"] } })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("assignTo", "firstName lastName email");

      res.status(200).json(invoices);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
};
