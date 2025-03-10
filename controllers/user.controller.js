import {User} from '../models/index.models.js'
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt'
import dotenv from 'dotenv'

dotenv.config();


export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        if (user.role !== "Admin") {
            return res.status(403).json({ message: "Access denied. Only Admin can log in." });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.SECRET_KEY,
            { expiresIn: "1h" }
        );

        res.json({ message: "Admin Login Successful", token });
    } catch (error) {
        res.status(500).json({ message: "Login failed", error: error.message });
    }
};

export const logout = async (req, res) => {
    try {
        // Optionally, maintain a token blacklist (e.g., Redis, DB)
        res.json({ message: "Logout successful" });
    } catch (error) {
        res.status(500).json({ message: "Logout failed", error: error.message });
    }
};
