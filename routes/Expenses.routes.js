// import express from "express";
// import { createExpense, getExpenses, upload } from "../controllers/Expenses.controller.js";

// const router = express.Router();

// router.post("/expenses", upload, createExpense);
// router.get("/expenses", getExpenses);

// export default router;

import express from "express";//ori
import {
  createExpense,
  getExpenses,
  updateExpense,
  deleteExpense,
  upload,
} from "../controllers/Expenses.controller.js";

const router = express.Router();

router.post("/expenses", upload, createExpense);
router.get("/expenses", getExpenses);
router.put("/expenses/:id", upload, updateExpense);
router.delete("/expenses/:id", deleteExpense);

export default router;


