import Expense from "../models/Expenses.model.js";//ori
import multer from "multer";
import path from "path";
import fs from "fs";

// Multer setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = "uploads/expenses";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

export const upload = multer({
  storage,
}).array("attachments", 10);

export const createExpense = async (req, res) => {
  try {
    const filePaths = req.files?.map(file => file.path);
    const expense = new Expense({
      ...req.body,
      attachments: filePaths || [],
    });
    await expense.save();
    res.status(201).json(expense);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getExpenses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const total = await Expense.countDocuments();
    const expenses = await Expense.find().skip(skip).limit(limit).sort({ createdAt: -1 });

    res.json({ expenses, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// export const updateExpense = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const filePaths = req.files?.map(file => file.path);

//     const updatedData = {
//       ...req.body,
//       ...(filePaths && { attachments: filePaths }),
//     };

//     const updated = await Expense.findByIdAndUpdate(id, updatedData, { new: true });
//     if (!updated) return res.status(404).json({ message: "Expense not found" });

//     res.json(updated);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

export const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Expense.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Expense not found" });

    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// export const updateExpense = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const existingExpense = await Expense.findById(id);

//     if (!existingExpense) {
//       return res.status(404).json({ message: "Expense not found" });
//     }

//     // New uploaded files
//     const newFilePaths = req.files?.map(file => file.path) || [];

//     // Existing attachments from the client (if any)
//     const existingFilePaths = req.body.attachments
//       ? Array.isArray(req.body.attachments)
//         ? req.body.attachments
//         : [req.body.attachments]
//       : existingExpense.attachments;

//     // Combine existing and new files (optional logic — you can change this behavior)
//     const combinedAttachments = [...existingFilePaths, ...newFilePaths];

//     const updatedData = {
//       ...req.body,
//       attachments: combinedAttachments,
//     };

//     const updated = await Expense.findByIdAndUpdate(id, updatedData, { new: true });

//     res.json(updated);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };


export const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const existingExpense = await Expense.findById(id);

    if (!existingExpense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    // New uploaded files
    const newFilePaths = req.files?.map(file => file.path) || [];

    // Get existing files that should be kept (from client)
    const existingFilesToKeep = JSON.parse(req.body.existingFiles || '[]');
    
    // Get files to remove (from client)
    const filesToRemove = JSON.parse(req.body.filesToRemove || '[]');

    // Combine kept existing files and new files
    const combinedAttachments = [...existingFilesToKeep, ...newFilePaths];

    const updatedData = {
      name: req.body.name,
      areaOfExpense: req.body.areaOfExpense,
      amount: req.body.amount,
      expenseDate: req.body.expenseDate,
      description: req.body.description,
      attachments: combinedAttachments,
    };

    const updated = await Expense.findByIdAndUpdate(id, updatedData, { new: true });

    // Optionally: Delete the removed files from the server here
    // filesToRemove.forEach(filePath => {
    //   fs.unlink(filePath, err => {
    //     if (err) console.error('Error deleting file:', err);
    //   });
    // });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};