import AreaExpense from "../models/AreaExpenses.model.js";

export const getAllAreaExpenses = async (req, res) => {
  try {
    const expenses = await AreaExpense.find();
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch expenses", error });
  }
};

export const createAreaExpense = async (req, res) => {
  try {
    const { name, description } = req.body;
    const newExpense = new AreaExpense({ name, description });
    await newExpense.save();
    res.status(201).json(newExpense);
  } catch (error) {
    res.status(500).json({ message: "Failed to create expense", error });
  }
};

export const updateAreaExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const updatedExpense = await AreaExpense.findByIdAndUpdate(
      id,
      { name, description },
      { new: true }
    );
    res.json(updatedExpense);
  } catch (error) {
    res.status(500).json({ message: "Failed to update expense", error });
  }
};

export const deleteAreaExpense = async (req, res) => {
  try {
    const { id } = req.params;
    await AreaExpense.findByIdAndDelete(id);
    res.json({ message: "Expense deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete expense", error });
  }
};
