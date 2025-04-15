// import {User} from '../models/index.models.js'
// import jwt from 'jsonwebtoken';
// import bcrypt from 'bcrypt'
// import dotenv from 'dotenv'

// dotenv.config();


// export default {
//     login : async (req, res) => {
//         try {
//             const { email, password } = req.body;
//             const user = await User.findOne({ email });
    
//             if (!user) {
//                 return res.status(400).json({ message: "User not found" });
//             }
    
//             if (user.role !== "Admin") {
//                 return res.status(403).json({ message: "Access denied. Only Admin can log in." });
//             }
    
//             const isMatch = await bcrypt.compare(password, user.password);
//             if (!isMatch) {
//                 return res.status(400).json({ message: "Invalid credentials" });
//             }
    
//             const token = jwt.sign(
//                 { id: user._id, role: user.role },
//                 process.env.SECRET_KEY,
//                 { expiresIn: "1h" }
//             );
    
//             res.json({ message: "Admin Login Successful", token });
//         } catch (error) {
//             res.status(500).json({ message: "Login failed", error: error.message });
//         }
//     },
    
//     logout : async (req, res) => {
//         try {
//             // Optionally, maintain a token blacklist (e.g., Redis, DB)
//             res.json({ message: "Logout successful" });
//         } catch (error) {
//             res.status(500).json({ message: "Logout failed", error: error.message });
//         }
//     },
// }


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

            res.json({ message: "Admin Login Successful", token });
        } catch (error) {
            res.status(500).json({ message: "Login failed", error: error.message });
        }
    },

    logout: async (req, res) => {
        try {
            res.json({ message: "Logout successful" });
        } catch (error) {
            res.status(500).json({ message: "Logout failed", error: error.message });
        }
    },
};