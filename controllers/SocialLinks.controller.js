import SocialLink from "../models/SocialLinks.model.js";

// Get all social links
export const getSocialLinks = async (req, res) => {
  try {
    const links = await SocialLink.find();
    res.status(200).json(links);
  } catch (error) {
    res.status(500).json({ message: "Error fetching social links", error });
  }
};

// Add a new social link
export const addSocialLink = async (req, res) => {
  try {
    const { name, url } = req.body;
    const newLink = new SocialLink({ name, url });
    await newLink.save();
    res.status(201).json(newLink);
  } catch (error) {
    res.status(500).json({ message: "Error adding social link", error });
  }
};

// Update a social link
export const updateSocialLink = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, url } = req.body;
    const updatedLink = await SocialLink.findByIdAndUpdate(id, { name, url }, { new: true });
    res.status(200).json(updatedLink);
  } catch (error) {
    res.status(500).json({ message: "Error updating social link", error });
  }
};

// Delete a social link
export const deleteSocialLink = async (req, res) => {
  try {
    const { id } = req.params;
    await SocialLink.findByIdAndDelete(id);
    res.status(200).json({ message: "Social link deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting social link", error });
  }
};
