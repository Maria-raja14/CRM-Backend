// import Invoice from "../models/invoice.model.js";
// import mongoose from "mongoose";
// import path from "path";
// import ejs from "ejs";
// import fs from "fs";
// import puppeteer from "puppeteer";
// import nodemailer from "nodemailer";

// // Keep a global browser instance
// let browserInstance = null;
// const getBrowser = async () => {
//   if (!browserInstance) {
//     browserInstance = await puppeteer.launch({
//       headless: true,
//       args: [
//         "--no-sandbox",
//         "--disable-setuid-sandbox",
//         "--disable-gpu",
//         "--disable-dev-shm-usage",
//       ],
//     });
//   }
//   return browserInstance;
// };

// export default {
//   createInvoice: async (req, res) => {
//     try {
//       // ✅ Only Admin can create invoice – case‑insensitive check
//       if (
//         !req.user ||
//         !req.user.role ||
//         req.user.role.name?.toLowerCase() !== "admin"
//       ) {
//         return res
//           .status(403)
//           .json({ error: "Only Admin can create invoices" });
//       }

//       let {
//         items,
//         tax = 0,
//         taxType = "percentage",
//         discountValue = 0,
//         discountType = "percentage",
//         currency = "USD",
//         assignTo, // sales user id
//         dueDate,
//         ...rest
//       } = req.body;

//       if (!items || items.length === 0) {
//         return res
//           .status(400)
//           .json({ error: "Invoice must contain at least one item" });
//       }

//       tax = Number(tax) || 0;
//       discountValue = Number(discountValue) || 0;

//       let subtotal = items.reduce((acc, item) => {
//         const quantity = Number(item.quantity) || 0;
//         const unitPrice = Number(item.unitPrice) || 0;
//         return acc + quantity * unitPrice;
//       }, 0);

//       let taxAmount = taxType === "percentage" ? (subtotal * tax) / 100 : tax;

//       let discount =
//         discountType === "percentage"
//           ? (subtotal * discountValue) / 100
//           : discountValue;

//       let total = subtotal + taxAmount - discount;
//       if (total < 0) total = 0;

//       const newInvoice = new Invoice({
//         items,
//         subtotal,
//         tax,
//         taxType,
//         taxAmount,
//         discountValue,
//         discountType,
//         discount,
//         total,
//         currency,
//         assignTo,
//         dueDate,
//         createdBy: req.user._id,
//         ...rest,
//       });

//       await newInvoice.save();

//       res.status(201).json({
//         message: "Invoice created successfully",
//         invoice: newInvoice,
//       });
//     } catch (error) {
//       console.error("❌ Error creating invoice:", error);
//       res.status(500).json({ error: error.message || "Internal server error" });
//     }
//   },

//   getInvoiceById: async (req, res) => {
//     try {
//       const invoice = await Invoice.findById(req.params.id)
//         .populate("assignTo", "firstName lastName email")
//         .populate("items.deal", "dealName value stage companyName");

//       if (!invoice) {
//         return res.status(404).json({ message: "Invoice not found" });
//       }
//       res.status(200).json(invoice);
//     } catch (error) {
//       res.status(500).json({ error: error.message });
//     }
//   },

//   getAllInvoices: async (req, res) => {
//     try {
//       if (!req.user) {
//         return res.status(401).json({ error: "Unauthorized: No user found" });
//       }

//       let invoicesQuery;

//       // Case‑insensitive role check
//       const roleName = req.user.role?.name?.toLowerCase();

//       if (roleName === "admin") {
//         // Admin → all invoices
//         invoicesQuery = Invoice.find();
//       } else if (roleName === "sales") {
//         // Sales → only invoices assigned to them
//         invoicesQuery = Invoice.find({ assignTo: req.user._id });
//       } else {
//         return res.status(403).json({ error: "Access denied" });
//       }

//       const invoices = await invoicesQuery
//         .populate("assignTo", "firstName lastName email")
//         .populate("items.deal", "dealName value stage")
//         .sort({ createdAt: -1 });

//       res.status(200).json(invoices);
//     } catch (error) {
//       console.error("❌ Error fetching invoices:", error);
//       res.status(500).json({ error: "Internal server error" });
//     }
//   },

//   updateInvoice: async (req, res) => {
//     console.log(req.body);

//     try {
//       const invoice = await Invoice.findById(req.params.id);

//       if (!invoice) {
//         return res.status(404).json({ message: "Invoice not found" });
//       }

//       let {
//         items,
//         tax = 0,
//         discount = 0,
//         discountType = "fixed",
//         discountValue = 0,
//         taxType = "fixed",
//         price,
//         ...rest
//       } = req.body;

//       let subtotal = 0;
//       let finalDiscount = 0;
//       let taxAmount = 0;
//       let finalTotal = 0;

//       if (items && items.length > 0) {
//         items = items.map((item) => {
//           const itemPrice = Number(item.price) || 0;
//           const quantity = Number(item.quantity) || 1;
//           const amount = itemPrice * quantity;
//           return {
//             ...item,
//             amount: amount.toFixed(2),
//           };
//         });

//         subtotal = items.reduce((sum, item) => sum + Number(item.amount), 0);
//       } else if (price) {
//         subtotal = Number(price) || 0;
//         items = [
//           {
//             deal: rest.deal || invoice.items?.[0]?.deal,
//             price: subtotal,
//             amount: subtotal,
//             quantity: 1,
//           },
//         ];
//       } else {
//         subtotal = invoice.subtotal || 0;
//       }

//       if (discountType === "percentage") {
//         finalDiscount = (subtotal * discountValue) / 100;
//       } else {
//         finalDiscount = Number(discountValue) || Number(discount) || 0;
//       }

//       if (finalDiscount > subtotal) {
//         finalDiscount = subtotal;
//       }

//       const discountedSubtotal = subtotal - finalDiscount;

//       if (taxType === "percentage") {
//         taxAmount = (discountedSubtotal * tax) / 100;
//       } else {
//         taxAmount = Number(tax) || 0;
//       }

//       finalTotal = discountedSubtotal + taxAmount;
//       if (finalTotal < 0) finalTotal = 0;

//       const updateData = {
//         ...rest,
//         items,
//         subtotal: Number(subtotal.toFixed(2)),
//         discount: Number(finalDiscount.toFixed(2)),
//         discountValue: Number(discountValue) || Number(discount) || 0,
//         discountType: discountType || "fixed",
//         tax: Number(tax) || 0,
//         taxType: taxType || "fixed",
//         taxAmount: Number(taxAmount.toFixed(2)),
//         total: Number(finalTotal.toFixed(2)),
//       };

//       const updatedInvoice = await Invoice.findByIdAndUpdate(
//         req.params.id,
//         updateData,
//         {
//           new: true,
//           runValidators: true,
//         }
//       )
//         .populate("assignTo", "firstName lastName email role")
//         .populate("items.deal", "dealName value stage");

//       res.status(200).json(updatedInvoice);
//     } catch (error) {
//       console.error("❌ Error updating invoice:", error);
//       res.status(500).json({ error: "Internal server error" });
//     }
//   },

//   deleteInvoice: async (req, res) => {
//     try {
//       const deletedInvoice = await Invoice.findByIdAndDelete(req.params.id);
//       if (!deletedInvoice) {
//         return res.status(404).json({ message: "Invoice not found" });
//       }
//       res.status(200).json({ message: "Invoice deleted successfully" });
//     } catch (error) {
//       res.status(500).json({ error: error.message });
//     }
//   },

//   // generateInvoicePDF: async (req, res) => {
//   //   try {
//   //     const invoiceId = req.params.id;

//   //     if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
//   //       return res.status(400).json({ error: "Invalid invoice ID" });
//   //     }

//   //     const invoice = await Invoice.findById(invoiceId)
//   //       .populate("assignTo", "firstName lastName email")
//   //       .populate(
//   //         "items.deal",
//   //         "dealName value stage email companyName address country phoneNumber"
//   //       );

//   //     if (!invoice) {
//   //       return res.status(404).json({ error: "Invoice not found" });
//   //     }

//   //     const templatePath = path.join(
//   //       process.cwd(),
//   //       "views",
//   //       "invoiceTemplate.ejs"
//   //     );

//   //     if (!fs.existsSync(templatePath)) {
//   //       console.error("Invoice template missing at:", templatePath);
//   //       return res.status(500).json({ error: "Template file not found" });
//   //     }

//   //     const templateData = await ejs.renderFile(
//   //       templatePath,
//   //       { invoice },
//   //       { async: true }
//   //     );

//   //     const browser = await puppeteer.launch({
//   //       headless: true,
//   //       args: [
//   //         "--no-sandbox",
//   //         "--disable-setuid-sandbox",
//   //         "--disable-gpu",
//   //         "--disable-dev-shm-usage",
//   //       ],
//   //     });

//   //     const page = await browser.newPage();
//   //     await page.setContent(templateData, { waitUntil: "networkidle0" });

//   //     const pdfBuffer = await page.pdf({
//   //       format: "A4",
//   //       margin: { top: "20mm", right: "10mm", bottom: "20mm", left: "10mm" },
//   //       printBackground: true,
//   //     });

//   //     await browser.close();

//   //     res.setHeader("Content-Type", "application/pdf");
//   //     res.setHeader(
//   //       "Content-Disposition",
//   //       `attachment; filename=Invoice_${
//   //         invoice.invoicenumber || invoice._id
//   //       }.pdf`
//   //     );
//   //     res.setHeader("Content-Length", pdfBuffer.length);

//   //     return res.end(pdfBuffer);
//   //   } catch (error) {
//   //     console.error("Error generating PDF:", error);
//   //     res
//   //       .status(500)
//   //       .json({ error: "Failed to generate PDF", details: error.message });
//   //   }
//   // },//old one


//   generateInvoicePDF: async (req, res) => {
//   try {
//     const invoiceId = req.params.id;

//     if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
//       return res.status(400).json({ error: "Invalid invoice ID" });
//     }

//     const invoice = await Invoice.findById(invoiceId)
//       .populate("assignTo", "firstName lastName email")
//       .populate(
//         "items.deal",
//         "dealName value stage email companyName address country phoneNumber"
//       );

//     if (!invoice) {
//       return res.status(404).json({ error: "Invoice not found" });
//     }

//     const templatePath = path.join(process.cwd(), "views", "invoiceTemplate.ejs");

//     if (!fs.existsSync(templatePath)) {
//       return res.status(500).json({ error: "Template file not found" });
//     }

//     // ✅ Reuse the global browser instance (same one used by sendInvoiceEmail)
//     const browser = await getBrowser();
//     const page = await browser.newPage();

//     const templateData = await ejs.renderFile(templatePath, { invoice }, { async: true });

//     await page.setContent(templateData, { waitUntil: "domcontentloaded" }); // ✅ faster than networkidle0

//     const pdfBuffer = await page.pdf({
//       format: "A4",
//       margin: { top: "20mm", right: "10mm", bottom: "20mm", left: "10mm" },
//       printBackground: true,
//     });

//     await page.close(); // ✅ Close page, not browser

//     res.setHeader("Content-Type", "application/pdf");
//     res.setHeader(
//       "Content-Disposition",
//       `attachment; filename=Invoice_${invoice.invoicenumber || invoice._id}.pdf`
//     );
//     res.setHeader("Content-Length", pdfBuffer.length);

//     return res.end(pdfBuffer);
//   } catch (error) {
//     console.error("Error generating PDF:", error);
//     res.status(500).json({ error: "Failed to generate PDF", details: error.message });
//   }
// },

//   sendInvoiceEmail: async (req, res) => {
//     try {
//       const { id } = req.params;

//       if (!mongoose.Types.ObjectId.isValid(id)) {
//         return res.status(400).json({ error: "Invalid invoice ID" });
//       }

//       const invoice = await Invoice.findById(id).populate(
//         "items.deal",
//         "dealName email value stage"
//       );

//       if (!invoice) {
//         return res.status(404).json({ error: "Invoice not found" });
//       }

//       const clientEmails = invoice.items
//         .map((item) => item.deal?.email)
//         .filter((email) => !!email);

//       if (clientEmails.length === 0) {
//         console.error(
//           `Invoice #${
//             invoice.invoicenumber || invoice._id
//           } has no deal/client emails!`
//         );
//         return res
//           .status(400)
//           .json({ error: "No client emails found in invoice deals" });
//       }

//       res.status(200).json({ message: "Invoice email is being sent!" });

//       setImmediate(async () => {
//         try {
//           const templatePath = path.join(
//             process.cwd(),
//             "views",
//             "invoiceTemplate.ejs"
//           );

//           if (!fs.existsSync(templatePath)) {
//             console.error("Invoice template missing at:", templatePath);
//             return;
//           }

//           const templateData = await ejs.renderFile(
//             templatePath,
//             { invoice },
//             { async: true }
//           );

//           const browser = await getBrowser();
//           const page = await browser.newPage();
//           await page.setContent(templateData, { waitUntil: "networkidle0" });

//           const pdfBuffer = await page.pdf({
//             format: "A4",
//             margin: {
//               top: "20mm",
//               right: "10mm",
//               bottom: "20mm",
//               left: "10mm",
//             },
//             printBackground: true,
//           });

//           await page.close();

//           const transporter = nodemailer.createTransport({
//             service: "gmail",
//             auth: {
//               user: process.env.EMAIL_USER,
//               pass: process.env.EMAIL_PASS,
//             },
//           });

//           for (const email of clientEmails) {
//             const mailOptions = {
//               from: `"Uenjoy Tours" <${process.env.EMAIL_USER}>`,
//               to: email,
//               subject: `Invoice #${invoice.invoicenumber || invoice._id}`,
//               text: `Hello,

// Please find attached your invoice #${invoice.invoicenumber || invoice._id}.

// Included deals:
// ${invoice.items
//   .map((item) => `- ${item.deal.dealName} ($${item.amount})`)
//   .join("\n")}

// Thank you!`,
//               attachments: [
//                 {
//                   filename: `Invoice_${
//                     invoice.invoicenumber || invoice._id
//                   }.pdf`,
//                   content: pdfBuffer,
//                 },
//               ],
//             };

//             await transporter.sendMail(mailOptions);
//             console.log(`✅ Invoice email sent to: ${email}`);
//           }
//         } catch (err) {
//           console.error("❌ Error sending invoice email asynchronously:", err);
//         }
//       });
//     } catch (error) {
//       console.error("❌ Error processing invoice email request:", error);
//       res.status(500).json({
//         error: "Failed to send invoice email",
//         details: error.message,
//       });
//     }
//   },

//   getRecentInvoices: async (_req, res) => {
//     try {
//       const now = new Date();
//       const oneMonthAgo = new Date();
//       oneMonthAgo.setMonth(now.getMonth() - 1);

//       const invoices = await Invoice.find({
//         createdAt: { $gte: oneMonthAgo, $lte: now },
//       })
//         .sort({ createdAt: -1 })
//         .populate("assignTo", "firstName lastName email");

//       res.status(200).json(invoices);
//     } catch (err) {
//       res.status(500).json({ error: err.message });
//     }
//   },

//   getPendingInvoices: async (_req, res) => {
//     try {
//       const invoices = await Invoice.find({ status: { $in: ["unpaid"] } })
//         .sort({ createdAt: -1 })
//         .limit(5)
//         .populate("assignTo", "firstName lastName email");

//       res.status(200).json(invoices);
//     } catch (err) {
//       res.status(500).json({ error: err.message });
//     }
//   },

//    deleteManyInvoices: async (req, res) => {
//     const { ids } = req.body;
 
//     if (!Array.isArray(ids) || ids.length === 0) {
//       return res.status(400).json({ error: "ids array is required and must not be empty" });
//     }
 
//     const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
//     if (validIds.length === 0) {
//       return res.status(400).json({ error: "No valid invoice IDs provided" });
//     }
 
//     try {
//       const result = await Invoice.deleteMany({ _id: { $in: validIds } });
//       res.status(200).json({
//         message: `${result.deletedCount} invoice(s) deleted successfully`,
//         deletedCount: result.deletedCount,
//       });
//     } catch (error) {
//       console.error("deleteManyInvoices error:", error);
//       res.status(500).json({ error: error.message });
//     }
//   },
// };//original 



import Invoice from "../models/invoice.model.js";
import mongoose from "mongoose";
import path from "path";
import ejs from "ejs";
import fs from "fs";
import https from "https";
import http from "http";
import puppeteer from "puppeteer";
import nodemailer from "nodemailer";

// ── Persistent browser instance ──────────────────────────────────────
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

// ── Fetch image as base64 (works for both local file and URL) ────────
const getImageAsBase64 = async (source) => {
  try {
    // 1️⃣ Try local file path first
    const localPaths = [
      path.join(process.cwd(), "public", "logo.png"),
      path.join(process.cwd(), "public", "images", "logo.png"),
      path.join(process.cwd(), "views", "logo.png"),
      path.join(process.cwd(), "assets", "logo.png"),
    ];

    for (const filePath of localPaths) {
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath);
        const ext  = path.extname(filePath).replace(".", "") || "png";
        console.log("✅ Logo loaded from local file:", filePath);
        return `data:image/${ext};base64,${data.toString("base64")}`;
      }
    }

    // 2️⃣ Fetch from URL if no local file found
    console.log("📡 Fetching logo from URL:", source);
    return await new Promise((resolve, reject) => {
      const urlObj   = new URL(source);
      const protocol = urlObj.protocol === "https:" ? https : http;

      protocol.get(source, { timeout: 10000 }, (response) => {
        // Follow redirects
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          getImageAsBase64(response.headers.location).then(resolve).catch(reject);
          return;
        }
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
        }

        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          const buffer      = Buffer.concat(chunks);
          const contentType = response.headers["content-type"] || "image/png";
          const base64      = buffer.toString("base64");
          console.log("✅ Logo fetched from URL successfully");
          resolve(`data:${contentType};base64,${base64}`);
        });
        response.on("error", reject);
      }).on("error", reject).on("timeout", () => reject(new Error("Timeout fetching logo")));
    });
  } catch (err) {
    console.warn("⚠️ Could not load logo:", err.message);
    return null; // return null — template will hide the image gracefully
  }
};

export default {

  // ── Create Invoice ─────────────────────────────────────────────────
  createInvoice: async (req, res) => {
    try {
      if (
        !req.user ||
        !req.user.role ||
        req.user.role.name?.toLowerCase() !== "admin"
      ) {
        return res.status(403).json({ error: "Only Admin can create invoices" });
      }

      let {
        items,
        tax           = 0,
        taxType       = "percentage",
        discountValue = 0,
        discountType  = "percentage",
        currency      = "USD",
        assignTo,
        dueDate,
        ...rest
      } = req.body;

      if (!items || items.length === 0) {
        return res.status(400).json({ error: "Invoice must contain at least one item" });
      }

      tax           = Number(tax)           || 0;
      discountValue = Number(discountValue) || 0;

      let subtotal = items.reduce((acc, item) => {
        return acc + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
      }, 0);

      let taxAmount = taxType      === "percentage" ? (subtotal * tax)           / 100 : tax;
      let discount  = discountType === "percentage" ? (subtotal * discountValue) / 100 : discountValue;
      let total     = subtotal + taxAmount - discount;
      if (total < 0) total = 0;

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
        createdBy: req.user._id,
        ...rest,
      });

      await newInvoice.save();

      res.status(201).json({ message: "Invoice created successfully", invoice: newInvoice });
    } catch (error) {
      console.error("❌ Error creating invoice:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  },

  // ── Get Invoice By ID ──────────────────────────────────────────────
  getInvoiceById: async (req, res) => {
    try {
      const invoice = await Invoice.findById(req.params.id)
        .populate("assignTo", "firstName lastName email")
        .populate("items.deal", "dealName value stage companyName");

      if (!invoice) return res.status(404).json({ message: "Invoice not found" });
      res.status(200).json(invoice);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // ── Get All Invoices ───────────────────────────────────────────────
  getAllInvoices: async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized: No user found" });

      const roleName = req.user.role?.name?.toLowerCase();
      let invoicesQuery;

      if (roleName === "admin") {
        invoicesQuery = Invoice.find();
      } else if (roleName === "sales") {
        invoicesQuery = Invoice.find({ assignTo: req.user._id });
      } else {
        return res.status(403).json({ error: "Access denied" });
      }

      const invoices = await invoicesQuery
        .populate("assignTo", "firstName lastName email")
        .populate("items.deal", "dealName value stage")
        .sort({ createdAt: -1 });

      res.status(200).json(invoices);
    } catch (error) {
      console.error("❌ Error fetching invoices:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // ── Update Invoice ─────────────────────────────────────────────────
  updateInvoice: async (req, res) => {
    try {
      const invoice = await Invoice.findById(req.params.id);
      if (!invoice) return res.status(404).json({ message: "Invoice not found" });

      let {
        items,
        tax           = 0,
        discount      = 0,
        discountType  = "fixed",
        discountValue = 0,
        taxType       = "fixed",
        price,
        ...rest
      } = req.body;

      let subtotal = 0, finalDiscount = 0, taxAmount = 0, finalTotal = 0;

      if (items && items.length > 0) {
        items    = items.map((item) => {
          const amount = (Number(item.price) || 0) * (Number(item.quantity) || 1);
          return { ...item, amount: amount.toFixed(2) };
        });
        subtotal = items.reduce((sum, item) => sum + Number(item.amount), 0);
      } else if (price) {
        subtotal = Number(price) || 0;
        items    = [{ deal: rest.deal || invoice.items?.[0]?.deal, price: subtotal, amount: subtotal, quantity: 1 }];
      } else {
        subtotal = invoice.subtotal || 0;
      }

      finalDiscount = discountType === "percentage"
        ? (subtotal * discountValue) / 100
        : Number(discountValue) || Number(discount) || 0;
      if (finalDiscount > subtotal) finalDiscount = subtotal;

      const discountedSubtotal = subtotal - finalDiscount;
      taxAmount  = taxType === "percentage" ? (discountedSubtotal * tax) / 100 : Number(tax) || 0;
      finalTotal = Math.max(0, discountedSubtotal + taxAmount);

      const updatedInvoice = await Invoice.findByIdAndUpdate(
        req.params.id,
        {
          ...rest, items,
          subtotal:      Number(subtotal.toFixed(2)),
          discount:      Number(finalDiscount.toFixed(2)),
          discountValue: Number(discountValue) || Number(discount) || 0,
          discountType:  discountType || "fixed",
          tax:           Number(tax)  || 0,
          taxType:       taxType      || "fixed",
          taxAmount:     Number(taxAmount.toFixed(2)),
          total:         Number(finalTotal.toFixed(2)),
        },
        { new: true, runValidators: true }
      )
        .populate("assignTo", "firstName lastName email role")
        .populate("items.deal", "dealName value stage");

      res.status(200).json(updatedInvoice);
    } catch (error) {
      console.error("❌ Error updating invoice:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // ── Delete Invoice ─────────────────────────────────────────────────
  deleteInvoice: async (req, res) => {
    try {
      const deletedInvoice = await Invoice.findByIdAndDelete(req.params.id);
      if (!deletedInvoice) return res.status(404).json({ message: "Invoice not found" });
      res.status(200).json({ message: "Invoice deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // ── Delete Many Invoices ───────────────────────────────────────────
  deleteManyInvoices: async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ error: "ids array is required and must not be empty" });

    const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0)
      return res.status(400).json({ error: "No valid invoice IDs provided" });

    try {
      const result = await Invoice.deleteMany({ _id: { $in: validIds } });
      res.status(200).json({ message: `${result.deletedCount} invoice(s) deleted successfully`, deletedCount: result.deletedCount });
    } catch (error) {
      console.error("deleteManyInvoices error:", error);
      res.status(500).json({ error: error.message });
    }
  },

  // ── Generate & Download PDF ────────────────────────────────────────
  generateInvoicePDF: async (req, res) => {
    try {
      const invoiceId = req.params.id;
      if (!mongoose.Types.ObjectId.isValid(invoiceId))
        return res.status(400).json({ error: "Invalid invoice ID" });

      const invoice = await Invoice.findById(invoiceId)
        .populate("assignTo", "firstName lastName email")
        .populate(
          "items.deal",
          "dealName value stage email companyName address country phoneNumber phone mobile contactNumber"
        );

      if (!invoice) return res.status(404).json({ error: "Invoice not found" });

      const templatePath = path.join(process.cwd(), "views", "invoiceTemplate.ejs");
      if (!fs.existsSync(templatePath)) {
        return res.status(500).json({ error: "Template file not found" });
      }

      // ✅ KEY FIX: Fetch logo as base64 so Puppeteer never needs network
      const logoBase64 = await getImageAsBase64(
        "https://uenjoytours.com/wp-content/uploads/2025/06/logo.png"
      );

      const templateData = await ejs.renderFile(
        templatePath,
        { invoice, logoBase64 },
        { async: true }
      );

      // ✅ Reuse browser — fast, no cold start
      const browser = await getBrowser();
      const page    = await browser.newPage();

      await page.setContent(templateData, { waitUntil: "domcontentloaded" });

      const pdfBuffer = await page.pdf({
        format:          "A4",
        margin:          { top: "20mm", right: "10mm", bottom: "20mm", left: "10mm" },
        printBackground: true,
      });

      await page.close(); // keep browser warm

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=Invoice_${invoice.invoicenumber || invoice._id}.pdf`
      );
      res.setHeader("Content-Length", pdfBuffer.length);
      return res.end(pdfBuffer);

    } catch (error) {
      console.error("❌ Error generating PDF:", error);
      res.status(500).json({ error: "Failed to generate PDF", details: error.message });
    }
  },

  // ── Send Invoice Email ─────────────────────────────────────────────
  sendInvoiceEmail: async (req, res) => {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id))
        return res.status(400).json({ error: "Invalid invoice ID" });

      const invoice = await Invoice.findById(id).populate(
        "items.deal",
        "dealName email value stage phoneNumber phone mobile contactNumber companyName address country"
      );

      if (!invoice) return res.status(404).json({ error: "Invoice not found" });

      const clientEmails = invoice.items
        .map((item) => item.deal?.email)
        .filter((email) => !!email);

      if (clientEmails.length === 0)
        return res.status(400).json({ error: "No client emails found in invoice deals" });

      // ✅ Respond immediately
      res.status(200).json({ message: "Invoice email is being sent!" });

      setImmediate(async () => {
        try {
          const templatePath = path.join(process.cwd(), "views", "invoiceTemplate.ejs");
          if (!fs.existsSync(templatePath)) {
            console.error("Invoice template missing at:", templatePath);
            return;
          }

          // ✅ Same base64 fix for email PDF
          const logoBase64 = await getImageAsBase64(
            "https://uenjoytours.com/wp-content/uploads/2025/06/logo.png"
          );

          const templateData = await ejs.renderFile(
            templatePath,
            { invoice, logoBase64 },
            { async: true }
          );

          const browser = await getBrowser();
          const page    = await browser.newPage();
          await page.setContent(templateData, { waitUntil: "domcontentloaded" });

          const pdfBuffer = await page.pdf({
            format:          "A4",
            margin:          { top: "20mm", right: "10mm", bottom: "20mm", left: "10mm" },
            printBackground: true,
          });

          await page.close();

          const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS,
            },
          });

          for (const email of clientEmails) {
            const phone =
              invoice.items[0]?.deal?.phoneNumber    ||
              invoice.items[0]?.deal?.phone          ||
              invoice.items[0]?.deal?.contactNumber  ||
              invoice.items[0]?.deal?.mobile         ||
              "";

            const mailOptions = {
              from:    `"U Enjoy Tours" <${process.env.EMAIL_USER}>`,
              to:      email,
              subject: `Invoice #${invoice.invoicenumber || invoice._id} from U Enjoy Tours`,
              html: `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:8px;">
                  <h2 style="color:#1e40af;margin-bottom:8px;">U Enjoy Tours</h2>
                  <p style="color:#475569;margin-bottom:16px;">Please find your invoice attached to this email.</p>
                  <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
                    <tr>
                      <td style="padding:8px;background:#f8fafc;font-weight:bold;width:40%;">Invoice Number</td>
                      <td style="padding:8px;">${invoice.invoicenumber || invoice._id}</td>
                    </tr>
                    <tr>
                      <td style="padding:8px;background:#f8fafc;font-weight:bold;">Invoice Date</td>
                      <td style="padding:8px;">${new Date(invoice.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</td>
                    </tr>
                    ${invoice.dueDate ? `
                    <tr>
                      <td style="padding:8px;background:#f8fafc;font-weight:bold;">Due Date</td>
                      <td style="padding:8px;">${new Date(invoice.dueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</td>
                    </tr>` : ""}
                    <tr>
                      <td style="padding:8px;background:#f8fafc;font-weight:bold;">Amount</td>
                      <td style="padding:8px;font-weight:bold;color:#1e40af;">${invoice.currency} ${Number(invoice.total).toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td style="padding:8px;background:#f8fafc;font-weight:bold;">Status</td>
                      <td style="padding:8px;">
                        <span style="padding:2px 10px;border-radius:12px;font-size:12px;font-weight:bold;background-color:${invoice.status === "paid" ? "#dcfce7" : "#fee2e2"};color:${invoice.status === "paid" ? "#16a34a" : "#dc2626"};">
                          ${(invoice.status || "unpaid").toUpperCase()}
                        </span>
                      </td>
                    </tr>
                    ${phone ? `
                    <tr>
                      <td style="padding:8px;background:#f8fafc;font-weight:bold;">Client Phone</td>
                      <td style="padding:8px;">${phone}</td>
                    </tr>` : ""}
                  </table>
                  <p style="color:#64748b;font-size:12px;margin-top:20px;border-top:1px solid #e2e8f0;padding-top:12px;">
                    For queries: uenjoytours@gmail.com | +91 9535542288<br/>
                    Terms & Conditions: Payment due within 30 days.
                  </p>
                </div>
              `,
              attachments: [
                {
                  filename: `Invoice_${invoice.invoicenumber || invoice._id}.pdf`,
                  content:  pdfBuffer,
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
      res.status(500).json({ error: "Failed to send invoice email", details: error.message });
    }
  },

  // ── Recent Invoices ────────────────────────────────────────────────
  getRecentInvoices: async (_req, res) => {
    try {
      const now = new Date();
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(now.getMonth() - 1);

      const invoices = await Invoice.find({ createdAt: { $gte: oneMonthAgo, $lte: now } })
        .sort({ createdAt: -1 })
        .populate("assignTo", "firstName lastName email");

      res.status(200).json(invoices);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // ── Pending Invoices ───────────────────────────────────────────────
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