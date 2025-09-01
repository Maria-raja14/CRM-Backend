import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import dotenv from "dotenv"

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
    // ✅ Use the env variable
    const decoded = jwt.verify(token, process.env.SECRET_KEY);

    // ✅ Load user from DB
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
  if (req.user.role.name !== "Admin") {
    return res.status(403).json({ message: "Access denied: Admins only" });
  }
  next();
};//original


