import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";


dotenv.config();

export default {
  // ✅ User Signup (Fix: Removed manual hashing)
  signup: async (req, res) => {
    try {
      const { email, password, mobileNumber } = req.body;

      // Check if email already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) return res.status(400).json({ message: "Email already exists" });

      // Check if mobile number already exists
      const existingMobile = await User.findOne({ mobileNumber });
      if (existingMobile) return res.status(400).json({ message: "Mobile number already exists" });

      // ✅ Mongoose will automatically hash the password in `pre("save")`
      const newUser = new User(req.body);
      await newUser.save();

      res.status(201).json({ message: "User registered successfully", user: newUser });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // ✅ User Login (Fix: Added logs to debug)
  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      console.log("Login Attempt:", { email, password });

      // 1️⃣ Check if user exists
      const user = await User.findOne({ email });
      console.log("User Found:", user);

      if (!user) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      // 2️⃣ Check if user is active
      if (!user.status) {
        return res.status(403).json({ message: "Account is deactivated. Contact support." });
      }

      // 3️⃣ Validate password (Fix: Log both passwords)
      console.log("Entered Password:", password);
      console.log("Stored Hashed Password:", user.password);

      const isMatch = await bcrypt.compare(password, user.password);
      console.log("Password Match:", isMatch);

      if (!isMatch) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      // 4️⃣ Generate JWT Token
      console.log("SECRET_KEY:", process.env.SECRET_KEY);
      const token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.SECRET_KEY || "defaultsecret",
        { expiresIn: "1h" }
      );

      res.json({ message: "Login successful", token, user });
    } catch (error) {
      console.error("Login Error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
  getAllUsers: async (req, res) => {
    try {
      const users = await User.find().select("firstName lastName profilePhoto");
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
 

  updateUser : async (req, res) => {
    try {
      const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
      });
      res.status(200).json({ message: "User updated successfully", updatedUser });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },


  // ✅ Get All Active Users
  getAllActiveUsers: async (req, res) => {
    try {
      const users = await User.find({ status: true });
      res.status(200).json(users);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // ✅ Deactivate User
  deactivateUser: async (req, res) => {
    try {
      const { userId } = req.params;
      await User.findByIdAndUpdate(userId, { status: false });
      res.status(200).json({ message: "User deactivated successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // ✅ Reactivate User
  reactivateUser: async (req, res) => {
    try {
      const { userId } = req.params;
      await User.findByIdAndUpdate(userId, { status: true });
      res.status(200).json({ message: "User reactivated successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
};
