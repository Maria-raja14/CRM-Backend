import Owner from "../models/Owner.js";
import mongoose from "mongoose";

// Create a new owner
export const createOwner = async (req, res) => {
  try {
    const owner = new Owner(req.body);
    await owner.save();
    res.status(201).json(owner);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get all owners
export const getAllOwners = async (req, res) => {
  try {
    const owners = await Owner.find();
    res.json(owners);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Get a single owner by ID
export const getOwnerById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid owner ID" });
    }

    const owner = await Owner.findById(id);

    if (!owner) {
      return res.status(404).json({ error: "Owner not found" });
    }

    res.json(owner);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};