import express from "express";
import indexController from "../controllers/index.controllers.js"

const router = express.Router();

router.post("/createinvoice",indexController.invoiceController. createInvoice); // Create an invoice
router.get("/getInvoice",indexController.invoiceController. getAllInvoices); // Get all invoices
router.get("/getSingle/:id",indexController.invoiceController. getInvoiceById); // Get a single invoice by ID
router.put("/updateInvoice/:id",indexController.invoiceController. updateInvoice); // Update an invoice
router.delete("/delete/:id",indexController.invoiceController. deleteInvoice); // Delete an invoice
router.get("/download/:id",indexController.invoiceController.generateInvoicePDF)
router.post("/sendEmail/:id", indexController.invoiceController.sendInvoiceEmail);

router.get("/recent", indexController.invoiceController.getRecentInvoices);
router.get("/pending",indexController.invoiceController.getPendingInvoices);

export default router;




