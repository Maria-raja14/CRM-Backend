import Deal from "../models/Deal.js";
import mongoose from "mongoose";

// Create a new deal
export const createDeal = async (req, res) => {
  try {
    const deal = new Deal(req.body);
    await deal.save();
    res.status(201).json(deal);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get all deals
export const getAllDeals = async (req, res) => {
  try {
    const deals = await Deal.find();
    res.json(deals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Get a single deal by ID
export const getDealById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid deal ID" });
    }

    const deal = await Deal.findById(id);

    if (!deal) {
      return res.status(404).json({ error: "Deal not found" });
    }

    res.json(deal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
