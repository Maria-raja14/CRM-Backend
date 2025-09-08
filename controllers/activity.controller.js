import mongoose from "mongoose";
import Activity from "../models/activity.models.js";
import Deal from "../models/deals.model.js"; // Make sure you have this


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


      const newActivity = new Activity({
        title,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        startTime,
        endTime,
        activityCategory,
        deal,
        assignedTo,
        reminder: reminder ? new Date(reminder) : undefined,
      });

      let savedActivity = await newActivity.save();

      // 👉 populate before sending
      savedActivity = await savedActivity.populate([
        { path: "deal", select: "title" },
        { path: "assignedTo", select: "firstName lastName email" },
      ]);

      res.status(201).json({
        message: "Activity added successfully",
        data: savedActivity,
      });
    } catch (error) {
      console.error("Error adding activity:", error);
      res.status(500).json({ message: "Error adding activity" });
    }
  },

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
          return res
            .status(400)
            .json({ message: "End date must be after start date" });
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

      res
        .status(200)
        .json({
          message: "Activity updated successfully",
          data: updatedActivity,
        });
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
