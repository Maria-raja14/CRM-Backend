import express from "express";
import {
  getAllAreaExpenses,
  createAreaExpense,
  updateAreaExpense,
  deleteAreaExpense,
} from "../controllers/AreaExpenses.controller.js";

const router = express.Router();

router.get("/area-expenses", getAllAreaExpenses);
router.post("/area-expenses", createAreaExpense);
router.put("/area-expenses/:id", updateAreaExpense);
router.delete("/area-expenses/:id", deleteAreaExpense);

export default router;
