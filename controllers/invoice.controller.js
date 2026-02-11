import Invoice from "../models/invoice.model.js";
import mongoose from "mongoose";
import path from "path";
import ejs from "ejs";
import fs from "fs";
import puppeteer from "puppeteer";
import nodemailer from "nodemailer";

// Keep a global browser instance
let browserInstance = null;
const getBrowser = async () => {
  if (!browserInstance) {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
      ],
    });
  }
  return browserInstance;
};

export default {
  createInvoice: async (req, res) => {
    try {
      // ✅ Only Admin can create invoice
      if (!req.user || !req.user.role || req.user.role.name !== "Admin") {
        return res
          .status(403)
          .json({ error: "Only Admin can create invoices" });
      }

      let {
        items,
        tax = 0,
        taxType = "percentage",
        discountValue = 0,
        discountType = "percentage",
        currency = "USD",
        assignTo, // sales user id
        dueDate,
        ...rest
      } = req.body;

      if (!items || items.length === 0) {
        return res
          .status(400)
          .json({ error: "Invoice must contain at least one item" });
      }

      // ✅ Convert tax and discountValue to numbers
      tax = Number(tax) || 0;
      discountValue = Number(discountValue) || 0;

      // ✅ Subtotal calculation with safety
      let subtotal = items.reduce((acc, item) => {
        const quantity = Number(item.quantity) || 0;
        const unitPrice = Number(item.unitPrice) || 0;
        return acc + quantity * unitPrice;
      }, 0);

      // ✅ Tax calculation
      let taxAmount = taxType === "percentage" ? (subtotal * tax) / 100 : tax;

      // ✅ Discount calculation
      let discount =
        discountType === "percentage"
          ? (subtotal * discountValue) / 100
          : discountValue;

      // ✅ Total calculation
      let total = subtotal + taxAmount - discount;
      if (total < 0) total = 0;

      // ✅ Create invoice document
      const newInvoice = new Invoice({
        items,
        subtotal,
        tax,
        taxType,
        taxAmount,
        discountValue,
        discountType,
        discount,
        total,
        currency,
        assignTo,
        dueDate,
        createdBy: req.user._id, // track which admin created
        ...rest,
      });

      await newInvoice.save();

      res.status(201).json({
        message: "Invoice created successfully",
        invoice: newInvoice,
      });
    } catch (error) {
      console.error("❌ Error creating invoice:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  },

  // ✅ Get Invoice by ID
  getInvoiceById: async (req, res) => {
    try {
      const invoice = await Invoice.findById(req.params.id)
        .populate("assignTo", "firstName lastName email")
        .populate("items.deal", "dealName value stage companyName");

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
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized: No user found" });
      }

      let invoicesQuery;

      if (req.user.role?.name === "Admin") {
        // Admin → all invoices
        invoicesQuery = Invoice.find();
      } else if (req.user.role?.name === "Sales") {
        // Sales → only invoices assigned to them
        invoicesQuery = Invoice.find({ assignTo: req.user._id });
      } else {
        return res.status(403).json({ error: "Access denied" });
      }

      const invoices = await invoicesQuery
        .populate("assignTo", "firstName lastName email")
        .populate("items.deal", "dealName value stage") // ✅ populate deal info
        .sort({ createdAt: -1 });

      res.status(200).json(invoices);
    } catch (error) {
      console.error("❌ Error fetching invoices:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // updateInvoice: async (req, res) => {
  //   console.log(req.body);

  //   try {
  //     const invoice = await Invoice.findById(req.params.id);

  //     if (!invoice) {
  //       return res.status(404).json({ message: "Invoice not found" });
  //     }

  //     // Sales can only update invoices assigned to them
  //     // if (
  //     //   req.user.role?.name === "Sales" &&
  //     //   invoice.assignTo.toString() !== req.user._id.toString()
  //     // ) {
  //     //   return res.status(403).json({ error: "Access denied" });
  //     // }

  //     let { items, tax = 0, discount = 0, ...rest } = req.body;

  //     if (items && items.length > 0) {
  //       items = items.map((item) => {
  //         const price = Number(item.price) || 0;
  //         const quantity = Number(item.quantity) || 1;
  //         const amount = price * quantity;
  //         return {
  //           ...item,
  //           amount: amount.toFixed(2),
  //         };
  //       });

  //       const subtotal = items.reduce(
  //         (sum, item) => sum + Number(item.amount),
  //         0
  //       );

  //       const taxValue = Number(tax) || 0;
  //       const discountValue = Number(discount) || 0;
  //       const discountedSubtotal = subtotal - discountValue;
  //       const taxAmount = (discountedSubtotal * taxValue) / 100;
  //       const total = discountedSubtotal + taxAmount;

  //       rest.items = items;
  //       rest.tax = taxValue;
  //       rest.discount = discountValue;
  //       rest.subtotal = subtotal;
  //       rest.total = Number(total.toFixed(2));
  //     }

  //     const updatedInvoice = await Invoice.findByIdAndUpdate(
  //       req.params.id,
  //       rest,
  //       {
  //         new: true,
  //         runValidators: true,
  //       }
  //     )
  //       .populate("assignTo", "firstName lastName email role")
  //       .populate("items.deal", "dealName value stage");

  //     res.status(200).json(updatedInvoice);
  //   } catch (error) {
  //     console.error("❌ Error updating invoice:", error);
  //     res.status(500).json({ error: "Internal server error" });
  //   }
  // },//org

  // ✅ Delete Invoice
 
 updateInvoice: async (req, res) => {
  console.log(req.body);

  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    let { 
      items, 
      tax = 0, 
      discount = 0, 
      discountType = "fixed", 
      discountValue = 0,
      taxType = "fixed",
      price, // Single price from frontend
      ...rest 
    } = req.body;

    // Calculate totals based on the data structure
    let subtotal = 0;
    let finalDiscount = 0;
    let taxAmount = 0;
    let finalTotal = 0;

    // If items array exists, calculate from items
    if (items && items.length > 0) {
      items = items.map((item) => {
        const itemPrice = Number(item.price) || 0;
        const quantity = Number(item.quantity) || 1;
        const amount = itemPrice * quantity;
        return {
          ...item,
          amount: amount.toFixed(2),
        };
      });

      subtotal = items.reduce((sum, item) => sum + Number(item.amount), 0);
    } 
    // If single price is provided (from frontend modal)
    else if (price) {
      subtotal = Number(price) || 0;
      // Create a single item if needed
      items = [{
        deal: rest.deal || invoice.items?.[0]?.deal,
        price: subtotal,
        amount: subtotal,
        quantity: 1
      }];
    }
    // Fallback to existing invoice subtotal
    else {
      subtotal = invoice.subtotal || 0;
    }

    // Calculate discount based on type
    if (discountType === "percentage") {
      finalDiscount = (subtotal * discountValue) / 100;
    } else {
      // Fixed amount discount
      finalDiscount = Number(discountValue) || Number(discount) || 0;
    }

    // Ensure discount doesn't exceed subtotal
    if (finalDiscount > subtotal) {
      finalDiscount = subtotal;
    }

    // Calculate tax
    const discountedSubtotal = subtotal - finalDiscount;
    
    if (taxType === "percentage") {
      taxAmount = (discountedSubtotal * tax) / 100;
    } else {
      taxAmount = Number(tax) || 0;
    }

    // Calculate final total
    finalTotal = discountedSubtotal + taxAmount;
    
    // Ensure total is not negative
    if (finalTotal < 0) {
      finalTotal = 0;
    }

    // Prepare update data
    const updateData = {
      ...rest,
      items,
      subtotal: Number(subtotal.toFixed(2)),
      discount: Number(finalDiscount.toFixed(2)),
      discountValue: Number(discountValue) || Number(discount) || 0,
      discountType: discountType || "fixed",
      tax: Number(tax) || 0,
      taxType: taxType || "fixed",
      taxAmount: Number(taxAmount.toFixed(2)),
      total: Number(finalTotal.toFixed(2))
    };

    const updatedInvoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("assignTo", "firstName lastName email role")
      .populate("items.deal", "dealName value stage");

    res.status(200).json(updatedInvoice);
  } catch (error) {
    console.error("❌ Error updating invoice:", error);
    res.status(500).json({ error: "Internal server error" });
  }
},
 
 
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
        return res.status(400).json({ error: "Invalid invoice ID" });
      }

      const invoice = await Invoice.findById(invoiceId)
        .populate("assignTo", "firstName lastName email")
        .populate(
          "items.deal",
          "dealName value stage email companyName address country phoneNumber"
        );

      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      const templatePath = path.join(
        process.cwd(),
        "views",
        "invoiceTemplate.ejs"
      );

      if (!fs.existsSync(templatePath)) {
        console.error("Invoice template missing at:", templatePath);
        return res.status(500).json({ error: "Template file not found" });
      }

      const templateData = await ejs.renderFile(
        templatePath,
        { invoice },
        { async: true }
      );

      const browser = await puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-gpu",
          "--disable-dev-shm-usage",
        ],
      });

      const page = await browser.newPage();
      await page.setContent(templateData, { waitUntil: "networkidle0" });

      const pdfBuffer = await page.pdf({
        format: "A4",
        margin: { top: "20mm", right: "10mm", bottom: "20mm", left: "10mm" },
        printBackground: true,
      });

      await browser.close();

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=Invoice_${
          invoice.invoicenumber || invoice._id
        }.pdf`
      );
      res.setHeader("Content-Length", pdfBuffer.length);

      return res.end(pdfBuffer);
    } catch (error) {
      console.error("Error generating PDF:", error);
      res
        .status(500)
        .json({ error: "Failed to generate PDF", details: error.message });
    }
  },

  sendInvoiceEmail: async (req, res) => {
    try {
      const { id } = req.params;

      // Validate invoice ID
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid invoice ID" });
      }

      // Fetch invoice with deal info
      const invoice = await Invoice.findById(id).populate(
        "items.deal",
        "dealName email value stage"
      );

      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      // Collect client emails from deals
      const clientEmails = invoice.items
        .map((item) => item.deal?.email)
        .filter((email) => !!email); // remove undefined/null

      if (clientEmails.length === 0) {
        console.error(
          `Invoice #${
            invoice.invoicenumber || invoice._id
          } has no deal/client emails!`
        );
        return res
          .status(400)
          .json({ error: "No client emails found in invoice deals" });
      }

      // Respond immediately to frontend
      res.status(200).json({ message: "Invoice email is being sent!" });

      // Async email sending
      setImmediate(async () => {
        try {
          const templatePath = path.join(
            process.cwd(),
            "views",
            "invoiceTemplate.ejs"
          );

          if (!fs.existsSync(templatePath)) {
            console.error("Invoice template missing at:", templatePath);
            return;
          }

          // Render EJS template
          const templateData = await ejs.renderFile(
            templatePath,
            { invoice },
            { async: true }
          );

          // Launch or reuse browser
          const browser = await getBrowser();
          const page = await browser.newPage();
          await page.setContent(templateData, { waitUntil: "networkidle0" });

          // Generate PDF
          const pdfBuffer = await page.pdf({
            format: "A4",
            margin: {
              top: "20mm",
              right: "10mm",
              bottom: "20mm",
              left: "10mm",
            },
            printBackground: true,
          });

          await page.close(); // close only page, reuse browser

          // Nodemailer setup
          const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS,
            },
          });

          // Send email to all client emails
          for (const email of clientEmails) {
            const mailOptions = {
              from: `"TechZarInfo Software Solution" <${process.env.EMAIL_USER}>`,
              to: email,
              subject: `Invoice #${invoice.invoicenumber || invoice._id}`,
              text: `Hello,

Please find attached your invoice #${invoice.invoicenumber || invoice._id}.

Included deals:
${invoice.items
  .map((item) => `- ${item.deal.dealName} ($${item.amount})`)
  .join("\n")}

Thank you!`,
              attachments: [
                {
                  filename: `Invoice_${
                    invoice.invoicenumber || invoice._id
                  }.pdf`,
                  content: pdfBuffer,
                },
              ],
            };

            await transporter.sendMail(mailOptions);
            console.log(`✅ Invoice email sent to: ${email}`);
          }
        } catch (err) {
          console.error("❌ Error sending invoice email asynchronously:", err);
        }
      });
    } catch (error) {
      console.error("❌ Error processing invoice email request:", error);
      res.status(500).json({
        error: "Failed to send invoice email",
        details: error.message,
      });
    }
  },

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
