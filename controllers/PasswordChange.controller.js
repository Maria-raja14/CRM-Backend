import bcrypt from "bcryptjs";
import Profile from "../models/Myprofileform.model.js"; 
import User from "../models/PasswordChange.model.js"; 

export const changePassword = async (req, res) => {
    try {
        const { email, newPassword, confirmPassword } = req.body;

        // Check if all required fields are provided
        if (!email || !newPassword || !confirmPassword) {
            return res.status(400).json({ message: "All fields are required." });
        }

        // Check if the new password matches the confirm password
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: "New passwords do not match." });
        }

        // Check if the user with the provided email exists in the Profile collection
        const profile = await Profile.findOne({ email });
        if (!profile) {
            return res.status(404).json({ message: "User not found with this email." });
        }

        // Check if the email already exists in the User model (password model)
        let user = await User.findOne({ email });
        
        if (user) {
            // If the user already exists, update the password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);
            user.password = hashedPassword;
            await user.save();
            res.status(200).json({ message: "Password updated successfully." });
        } else {
          
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);
            
            user = new User({
                email,
                password: hashedPassword,
            });

            await user.save();
            res.status(201).json({ message: "Password created successfully." });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

