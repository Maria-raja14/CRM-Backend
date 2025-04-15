import Profile from "../models/Myprofileform.model.js";

export const createProfile = async (req, res) => {
    try {
        const newProfile = new Profile(req.body);
        await newProfile.save();
        res.status(201).json({ message: "Profile created successfully", profile: newProfile });
    } catch (error) {
        res.status(500).json({ message: "Error saving profile", error });
    }
};
