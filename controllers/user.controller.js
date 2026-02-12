import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import fs from "fs";
import sendEmail from "../utils/sendEmail.js";
import crypto from "crypto";

dotenv.config();

const generateToken = (id) =>
  jwt.sign({ id }, process.env.SECRET_KEY, { expiresIn: "1d" });

export default {
  createUser: async (req, res) => {
    console.log("BODY:", req.body);
    console.log("FILE:", req.file);

    try {
      const {
        firstName,
        lastName,
        email,
        password,
        mobileNumber,
        role,
        status,
        gender,
        address,
        dateOfBirth,
      } = req.body;

      const existingUser = await User.findOne({ email });

      if (existingUser) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res
          .status(400)
          .json({ message: "User already exists with this email" });
      }

      // ✅ filename mattum DB-la save
      const profileImage = req.file ? req.file.filename : null;

      const user = await User.create({
        firstName,
        lastName,
        email,
        password,
        mobileNumber,
        role,
        status,
        gender,
        address,
        dateOfBirth,
        profileImage,
      });

      res.status(201).json(user);
    } catch (err) {
      if (req.file) fs.unlinkSync(req.file.path);
      res.status(500).json({ message: err.message });
    }
  },

  getUsers: async (req, res) => {
    try {
      const users = await User.find().populate("role");

      res.json({
        users,
        total: users.length,
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  updateUser: async (req, res) => {
    try {
      const { id } = req.params;

      const {
        firstName,
        lastName,
        email,
        mobileNumber,
        role,
        status,
        gender,
        address,
        dateOfBirth,
      } = req.body;

      // 1️⃣ Find user
      const user = await User.findById(id);
      if (!user) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(404).json({ message: "User not found" });
      }

      // 2️⃣ Email duplicate check
      if (email && email !== user.email) {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          if (req.file) fs.unlinkSync(req.file.path);
          return res.status(400).json({ message: "Email already taken" });
        }
      }

      // 3️⃣ Image replace logic (IMPORTANT)
      let profileImage = user.profileImage;

      if (req.file) {
        // delete old image
        if (user.profileImage) {
          const oldPath = `uploads/users/${user.profileImage}`;
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }

        // save only filename in DB
        profileImage = req.file.filename;
      }

      // 4️⃣ Update user
      const updatedUser = await User.findByIdAndUpdate(
        id,
        {
          firstName,
          lastName,
          email,
          mobileNumber,
          role,
          status,
          gender,
          address,
          dateOfBirth,
          profileImage,
        },
        { new: true, runValidators: true },
      ).populate("role");

      res.json(updatedUser);
    } catch (err) {
      if (req.file) fs.unlinkSync(req.file.path);
      res.status(500).json({ message: err.message });
    }
  },

  deleteUser: async (req, res) => {
    try {
      const { id } = req.params;
      const deletedUser = await User.findByIdAndDelete(id);

      if (!deletedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ message: "User deleted successfully" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  // ✅ FIXED loginUser
  loginUser: async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email })
        .populate("role")
        .select("+password");

      if (!user || !(await user.matchPassword(password))) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const now = new Date();
      // ✅ Always push a new login entry (even if multiple times per day)
      user.loginHistory.push({ login: now });
      await user.save({ validateBeforeSave: false });

      res.json({
        message: "Login successful",
        _id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        profileImage: user.profileImage,
        role: user.role,
        token: generateToken(user._id),
      });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ message: err.message });
    }
  },

  // ✅ FIXED logoutUser
  logoutUser: async (req, res) => {
    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });

      const now = new Date();

      // ✅ Find the latest login without logout
      const latestEntry = [...user.loginHistory]
        .reverse()
        .find((e) => !e.logout);
      if (latestEntry) {
        latestEntry.logout = now;
        await user.save({ validateBeforeSave: false });
      } else {
        console.warn("⚠️ No open login session found for logout update");
      }

      res.json({ message: "Logout successful" });
    } catch (err) {
      console.error("Logout error:", err);
      res.status(500).json({ message: err.message });
    }
  },

  // Add this to your existing user controller
  updatePassword: async (req, res) => {
    try {
      const { email, currentPassword, newPassword } = req.body;
      const userId = req.user.id; // From auth middleware

      // Find user
      const user = await User.findById(userId).select("+password");

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify email matches
      if (user.email !== email) {
        return res
          .status(400)
          .json({ message: "Email does not match your account" });
      }

      // Verify current password
      if (!(await user.matchPassword(currentPassword))) {
        return res
          .status(401)
          .json({ message: "Current password is incorrect" });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      res.json({ message: "Password updated successfully" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  forgotPassword: async (req, res) => {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const resetToken = user.getResetPasswordToken();
      await user.save({ validateBeforeSave: false });

      // const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
      const resetUrl = `https://crm.stagingzar.com/reset-password/${resetToken}`;
      const message = `
        <h2>Password Reset</h2>
        <p>You requested a password reset</p>
        <p>Click this link to reset your password:</p>
        <a href="${resetUrl}">${resetUrl}</a>
      `;

      await sendEmail({
        to: user.email,
        subject: "Password Reset",
        html: message,
      });

      res.json({ message: "Reset link sent to your email" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err.message });
    }
  },

  resetPassword: async (req, res) => {
    try {
      const resetPasswordToken = crypto
        .createHash("sha256")
        .update(req.params.token)
        .digest("hex");

      const user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() },
      });

      if (!user) {
        return res.status(400).json({ message: "Invalid or expired token" });
      }

      user.password = req.body.password;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();

      res.json({ message: "Password reset successful" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
};
