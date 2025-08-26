import mongoose from "mongoose";
import Activity from "../models/activity.models.js";
import Deal from "../models/deals.model.js"; // Make sure you have this
// import User from "../models/user.models.js"; // For assignedTo reference

export default {
  // GET all activities
  getActivities: async (req, res) => {
    try {
      const activities = await Activity.find()
        .populate("deal", "title") // populate deal title
        .populate("assignedTo", "firstName  lastName email"); // populate assigned user

      res.status(200).json(activities);
    } catch (error) {
      console.error("Error fetching activities:", error);
      res.status(500).json({ message: "Error fetching activities" });
    }
  },

  // GET activity by ID
  getActivityById: async (req, res) => {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id))
        return res.status(400).json({ message: "Invalid activity ID" });

      const activity = await Activity.findById(id)
        .populate("deal", "title")
        .populate("assignedTo", "name email");

      if (!activity)
        return res.status(404).json({ message: "Activity not found" });

      res.status(200).json(activity);
    } catch (error) {
      console.error("Error fetching activity:", error);
      res.status(500).json({ message: "Error fetching activity" });
    }
  },

  // ADD new activity
  addActivity: async (req, res) => {
    try {
      const {
        title,
        description,
        startDate,
        endDate,
        startTime,
        endTime,
        activityCategory,
        deal,
        assignedTo,
        reminder,
      } = req.body;

      // Validate required fields
      if (!title || !startDate || !endDate || !startTime || !endTime || !activityCategory || !deal)
        return res.status(400).json({ message: "Missing required fields" });

      if (!mongoose.Types.ObjectId.isValid(deal))
        return res.status(400).json({ message: "Invalid deal ID" });

      const dealExists = await Deal.findById(deal);
      if (!dealExists)
        return res.status(404).json({ message: "Deal not found" });

      if (assignedTo && !mongoose.Types.ObjectId.isValid(assignedTo))
        return res.status(400).json({ message: "Invalid assignedTo ID" });

      // Validate time format
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
      if (!timeRegex.test(startTime) || !timeRegex.test(endTime))
        return res.status(400).json({ message: "Invalid time format. Use HH:mm" });

      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end < start)
        return res.status(400).json({ message: "End date must be after start date" });

      if (start.toDateString() === end.toDateString() && startTime >= endTime)
        return res.status(400).json({ message: "End time must be after start time" });

      // Create activity
      const newActivity = new Activity({
        title,
        description,
        startDate: start,
        endDate: end,
        startTime,
        endTime,
        activityCategory,
        deal,
        assignedTo,
        reminder: reminder ? new Date(reminder) : undefined,
      });

      const savedActivity = await newActivity.save();
      res.status(201).json({ message: "Activity added successfully", data: savedActivity });
    } catch (error) {
      console.error("Error adding activity:", error);
      res.status(500).json({ message: "Error adding activity" });
    }
  },

  // UPDATE activity
  // UPDATE activity
updateActivity: async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid activity ID" });

    const { startDate, endDate, deal, assignedTo } = req.body;

    // Date validation
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end < start)
        return res.status(400).json({ message: "End date must be after start date" });
    }

    // Deal & assignedTo validation
    if (deal && !mongoose.Types.ObjectId.isValid(deal))
      return res.status(400).json({ message: "Invalid deal ID" });

    if (assignedTo && !mongoose.Types.ObjectId.isValid(assignedTo))
      return res.status(400).json({ message: "Invalid assignedTo ID" });

    // Update activity
    const updatedActivity = await Activity.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate("deal", "title") // populate deal title
      .populate("assignedTo", "firstName lastName email"); // populate assigned user

    if (!updatedActivity)
      return res.status(404).json({ message: "Activity not found" });

    res.status(200).json({ message: "Activity updated successfully", data: updatedActivity });
  } catch (error) {
    console.error("Error updating activity:", error);
    res.status(500).json({ message: "Error updating activity" });
  }
},


  // DELETE activity
  deleteActivity: async (req, res) => {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id))
        return res.status(400).json({ message: "Invalid activity ID" });

      const deletedActivity = await Activity.findByIdAndDelete(id);
      if (!deletedActivity)
        return res.status(404).json({ message: "Activity not found" });

      res.status(200).json({ message: "Activity deleted successfully" });
    } catch (error) {
      console.error("Error deleting activity:", error);
      res.status(500).json({ message: "Error deleting activity" });
    }
  },
};
