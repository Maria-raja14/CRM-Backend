import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import Lead from "../models/leads.model.js";
import Deal from "../models/deals.model.js";
import dotenv from "dotenv";

dotenv.config();

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    req.user = await User.findById(decoded.id).populate("role");
    
    if (!req.user) {
      return res.status(401).json({ message: "User not found" });
    }

    next();
  } catch (err) {
    return res.status(401).json({ message: "Token failed" });
  }
};

export const adminOnly = (req, res, next) => {
  if (req.user.role.name !== "Admin" && req.user.role.name !== "Sales") {
    return res.status(403).json({ message: "Access denied: Admins only" });
  }
  next();
};

// New middleware to check if user is admin or assigned to the lead
export const adminOrAssigned = async (req, res, next) => {
  try {
    // Admin can access everything
    if (req.user.role.name === "Admin") {
      return next();
    }
    
    // For non-admin users, check if they're assigned to the lead
    const leadId = req.params.id;
    const lead = await Lead.findById(leadId);
    
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }
    
    // Check if the current user is assigned to this lead
    if (lead.assignTo && lead.assignTo.toString() === req.user._id.toString()) {
      return next();
    }
    
    return res.status(403).json({ message: "Access denied: You can only access leads assigned to you" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const adminOrAssignedToDeal = async (req, res, next) => {
  try {
    // Admin can access everything
    if (req.user.role.name === "Admin") {
      return next();
    }
    
    // For non-admin users, check if they're assigned to the deal
    const dealId = req.params.id;
    const deal = await Deal.findById(dealId);
    
    if (!deal) {
      return res.status(404).json({ message: "Deal not found" });
    }
    
    // Check if the current user is assigned to this deal
    if (deal.assignedTo && deal.assignedTo.toString() === req.user._id.toString()) {
      return next();
    }
    
    return res.status(403).json({ message: "Access denied: You can only access deals assigned to you" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Middleware to check if user is admin or sales
// export const adminOrSales = (req, res, next) => {
//   if (req.user.role.name === "Admin" || req.user.role.name === "Sales") {
//     return next();
//   }
//   return res.status(403).json({ message: "Access denied: Admins or Sales only" });
// };
export const adminOrSales = (req, res, next) => {
  if (req.user.role.name === "Admin" || req.user.role.name === "Sales") {
    return next();
  }
  return res.status(403).json({ message: "Access denied: Admins or Sales only" });
};

// Middleware to check if user is admin or the same user
export const adminOrSelf = (req, res, next) => {
  if (req.user.role.name === "Admin" || req.user._id.toString() === req.params.id) {
    return next();
  }
  return res.status(403).json({ message: "Access denied" });
};