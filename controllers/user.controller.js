import { Admin } from '../models/index.models.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

export default {
    login: async (req, res) => {
        
        try {
            const { email, password } = req.body;
            
            
            // Find admin in the correct model
            const admin = await Admin.findOne({ email });

            if (!admin) {
                return res.status(400).json({ message: "Admin not found" });
            }

            if (admin.role !== "Admin") {
                return res.status(403).json({ message: "Access denied. Only Admin can log in." });
            }

            // Compare hashed password
            const isMatch = await bcrypt.compare(password, admin.password);
            if (!isMatch) {
                return res.status(400).json({ message: "Invalid credentials" });
            }

            // Generate JWT token
            const token = jwt.sign(
                { id: admin._id, role: admin.role },
                process.env.SECRET_KEY,
                { expiresIn: "1h" }
            );
console.log("req.body iss => ",req.body);
            res.json({ message: "Admin Login Successful", token });
        } catch (error) {
            res.status(500).json({ message: "Login failed", error: error.message });
        }
    },

    logout: async (req, res) => {
        try {
            res.json({ message: "Logout successfully" });
        } catch (error) {
            res.status(500).json({ message: "Logout failed", error: error.message });
        }
    },
};