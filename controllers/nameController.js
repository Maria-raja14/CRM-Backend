// const Name = require("../models/nameModel");
import Name from "../models/LastreasonsModels.js"


export default {

// Create a new name
createName : async (req, res) => {
  try {
    const newName = new Name({ name: req.body.name });
    await newName.save();
    res.status(201).json(newName);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
},

// Get all names
getNames : async (req, res) => {
  try {
    const names = await Name.find();
    res.status(200).json(names);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
},

// Get a single name by ID
getNameById : async (req, res) => {
  try {
    const name = await Name.findById(req.params.id);
    if (!name) return res.status(404).json({ message: "Name not found" });
    res.status(200).json(name);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
},

// Update a name by ID
updateName : async (req, res) => {
  try {
    const updatedName = await Name.findByIdAndUpdate(
      req.params.id,
      { name: req.body.name },
      { new: true }
    );
    if (!updatedName) return res.status(404).json({ message: "Name not found" });
    res.status(200).json(updatedName);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
},

// Delete a name by ID
 deleteName : async (req, res) => {
  try {
    const deletedName = await Name.findByIdAndDelete(req.params.id);
    if (!deletedName) return res.status(404).json({ message: "Name not found" });
    res.status(200).json({ message: "Name deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
}