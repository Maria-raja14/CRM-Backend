import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import fs from "fs";
import sendEmail from "../utils/sendEmail.js";
import crypto from "crypto"; 

dotenv.config();

const generateToken = (id) => jwt.sign({ id }, process.env.SECRET_KEY, { expiresIn: "1d" });

export default {

createUser : async (req, res) => {
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
      dateOfBirth
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      // Remove uploaded file if user already exists
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ message: "User already exists with this email" });
    }

    const profileImage = req.file ? req.file.path : null;

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
      profileImage
    });

    res.status(201).json(user);
  } catch (err) {
    // Remove uploaded file if error occurs
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: err.message });
  }
},

getUsers: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const users = await User.find().populate("role")
        .skip(skip)
        .limit(limit);
      
      const total = await User.countDocuments();

      res.json({
        users,
        total,
        page,
        pages: Math.ceil(total / limit)
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },


 updateUser : async (req, res) => {
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
      dateOfBirth
    } = req.body;

    // Find user
    const user = await User.findById(id);
    if (!user) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ message: "User not found" });
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({ message: "Email already taken" });
      }
    }

    // If new image is uploaded, delete the old one
    let profileImage = user.profileImage;
    if (req.file) {
      // Delete old image if it exists
      if (user.profileImage && fs.existsSync(user.profileImage)) {
        fs.unlinkSync(user.profileImage);
      }
      profileImage = req.file.path;
    }

    // Update user
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
        profileImage
      },
      { new: true, runValidators: true }
    ).populate("role");

    res.json(updatedUser);
  } catch (err) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
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

  

loginUser: async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email })
      .populate("role")
      .select("+password");

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    res.json({
      message: "Login successful",
      _id: user._id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
       profileImage: user.profileImage, // Add this line
      role: {
        _id: user.role._id,
        name: user.role.name,
        permissions: user.role.permissions,
         profileImage: user.profileImage // Add this line
      }, // Send the full role object with name and permissions
      token: generateToken(user._id),
    });
  } catch (err) {
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
      return res.status(400).json({ message: "Email does not match your account" });
    }

    // Verify current password
    if (!(await user.matchPassword(currentPassword))) {
      return res.status(401).json({ message: "Current password is incorrect" });
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