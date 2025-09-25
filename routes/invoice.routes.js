import express from "express";
import indexController from "../controllers/index.controllers.js";
import { adminOnly, adminOrSales } from "../middlewares/auth.middleware.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post(
  "/createinvoice",
  protect, // ⬅️ this must come first to set req.user
  adminOrSales, // ⬅️ now req.user is available here
  indexController.invoiceController.createInvoice
);

// ⬇️ Add protect here so req.user is available
router.get(
  "/getInvoice",
  protect,
  indexController.invoiceController.getAllInvoices
);

router.get(
  "/getSingle/:id",
  protect,
  indexController.invoiceController.getInvoiceById
);
router.put(
  "/updateInvoice/:id",
  indexController.invoiceController.updateInvoice
);
router.delete("/delete/:id", indexController.invoiceController.deleteInvoice);
router.get(
  "/download/:id",
  indexController.invoiceController.generateInvoicePDF
);
router.post(
  "/sendEmail/:id",
  indexController.invoiceController.sendInvoiceEmail
);

router.get("/recent", indexController.invoiceController.getRecentInvoices);
router.get("/pending", indexController.invoiceController.getPendingInvoices);

export default router;
