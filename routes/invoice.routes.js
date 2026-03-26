// import express from "express";
// import indexController from "../controllers/index.controllers.js";
// import { adminOnly, adminOrSales } from "../middlewares/auth.middleware.js";
// import { protect } from "../middlewares/auth.middleware.js";

// const router = express.Router();

// router.post(
//   "/createinvoice",
//   protect, // ⬅️ this must come first to set req.user
//   adminOrSales, // ⬅️ now req.user is available here
//   indexController.invoiceController.createInvoice
// );

// // ⬇️ Add protect here so req.user is available
// router.get(
//   "/getInvoice",
//   protect,
//   indexController.invoiceController.getAllInvoices
// );

// router.get(
//   "/getSingle/:id",
//   protect,
//   indexController.invoiceController.getInvoiceById
// );
// router.put(
//   "/updateInvoice/:id",
//   indexController.invoiceController.updateInvoice
// );
// router.delete("/delete/:id", indexController.invoiceController.deleteInvoice);

// // IMPORTANT: /deletemany must be registered BEFORE /delete/:id to avoid route conflict
// router.delete("/deletemany", indexController.invoiceController.deleteManyInvoices);

// router.get(
//   "/download/:id",
//   indexController.invoiceController.generateInvoicePDF
// );
// router.post(
//   "/sendEmail/:id",
//   indexController.invoiceController.sendInvoiceEmail
// );

// router.get("/recent", indexController.invoiceController.getRecentInvoices);
// router.get("/pending", indexController.invoiceController.getPendingInvoices);

// export default router;//original



import express from "express";
import indexController from "../controllers/index.controllers.js";
import { protect, adminOrManager, adminSalesAccountsOrManager } from "../middlewares/auth.middleware.js";

const router = express.Router();

// ✅ Create invoice — Admin or Manager only
router.post(
  "/createinvoice",
  protect,
  adminOrManager,
  indexController.invoiceController.createInvoice
);

// ✅ Get all invoices — Admin/Manager see all; Sales/Accounts see their own
router.get(
  "/getInvoice",
  protect,
  adminSalesAccountsOrManager,
  indexController.invoiceController.getAllInvoices
);

router.get(
  "/getSingle/:id",
  protect,
  adminSalesAccountsOrManager,
  indexController.invoiceController.getInvoiceById
);

router.put(
  "/updateInvoice/:id",
  protect,
  adminSalesAccountsOrManager,
  indexController.invoiceController.updateInvoice
);

router.delete(
  "/deletemany",
  protect,
  adminOrManager,
  indexController.invoiceController.deleteManyInvoices
);

router.delete(
  "/delete/:id",
  protect,
  adminOrManager,
  indexController.invoiceController.deleteInvoice
);

router.get(
  "/download/:id",
  protect,
  adminSalesAccountsOrManager,
  indexController.invoiceController.generateInvoicePDF
);

router.post(
  "/sendEmail/:id",
  protect,
  adminSalesAccountsOrManager,
  indexController.invoiceController.sendInvoiceEmail
);

router.get("/recent", protect, indexController.invoiceController.getRecentInvoices);
router.get("/pending", protect, indexController.invoiceController.getPendingInvoices);

export default router;