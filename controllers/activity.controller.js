import mongoose from "mongoose";  
import Activity from "../models/activity.models.js";
import AllDeals from "../models/alldeals.models.js";
import Person from "../models/person.models.js";
import Organization from "../models/organization.models.js";

export default {
  
    getActivities: async (req, res) => {
        try {
          const activities = await Activity.find()
            .populate("activityType") 
            .populate({
              path: "collaborators",
              populate: { path: "owner", select: "name email" }, 
            });
      
          res.status(200).json(activities);
        } catch (error) {
          console.error("Error fetching activities:", error);
          res.status(500).json({ message: "Error fetching activities" });
        }
      },
      
  getActivityById: async (req, res) => {
    try {
      const { id } = req.params;
      const activity = await Activity.findById(id)
        .populate("activityType")
        .populate("collaborators", "name email");

      if (!activity) {
        return res.status(404).json({ message: "Activity not found" });
      }

      res.status(200).json(activity);
    } catch (error) {
      console.error("Error fetching activity:", error);
      res.status(500).json({ message: "Error fetching activity" });
    }
  },

  
//   addActivity: async (req, res) => {
//     try {
//       const {
//         title,
//         description,
//         startDate,
//         endDate,
//         startTime,
//         endTime,
//         activityCategory,
//         activityType,
//         activityModel,
      
//         collaborators,
//         reminder,
//       } = req.body;

      
//       const start = new Date(startDate);
//       const end = new Date(endDate);

//       if (isNaN(start.getTime()) || isNaN(end.getTime())) {
//         return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD." });
//       }

//       if (end < start) {
//         return res.status(400).json({ message: "End date must be after start date." });
//       }

//       // 🔹 3. Validate startTime & endTime (Regex: HH:mm format)
//       const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
//       if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
//         return res.status(400).json({ message: "Invalid time format. Use HH:mm (24-hour format)." });
//       }

//       // 🔹 4. Ensure end time is after start time (only if on the same day)
//       if (start.toDateString() === end.toDateString() && startTime >= endTime) {
//         return res.status(400).json({ message: "End time must be after start time." });
//       }

//       // 🔹 5. Validate category
//       const validCategories = ["Call", "Meeting", "Email", "Task", "Deadline", "Other"];
//       if (!validCategories.includes(activityCategory)) {
//         return res.status(400).json({ message: "Invalid activity category." });
//       }

//       // 🔹 6. Validate model type
//       const validModels = ["Deal", "Person", "Organization"];
//       if (!validModels.includes(activityModel)) {
//         console.log("Invalid activityModel received:", activityModel);
//         return res.status(400).json({ message: "Invalid activity model." });
//       }

//       // 🔹 7. Validate activityType (should be a valid ObjectId)
//       if (!mongoose.Types.ObjectId.isValid(activityType)) {
        
//         return res.status(400).json({ message: "Invalid ObjectId format for activityType." });
//       }

//       // 🔹 8. Check if the referenced model exists
//       let modelExists;
//       if (activityModel === "Deal") {
//         modelExists = await AllDeals.findById(activityType);
//       } else if (activityModel === "Person") {
//         modelExists = await Person.findById(activityType);
//       } else if (activityModel === "Organization") {
//         modelExists = await Organization.findById(activityType);
//       }

//       if (!modelExists) {
//         return res.status(404).json({ message: `${activityModel} with the given ID not found.` });
//       }

//       // 🔹 9. Validate and convert reminder time
//       let reminderTime;
//       if (reminder) {
//         const reminderMap = {
//           "15min": -15,
//           "30min": -30,
//           "1hour": -60,
//           "1day": -1440,
//         };

//         if (!reminderMap.hasOwnProperty(reminder)) {
//           return res.status(400).json({ message: "Invalid reminder option. Choose 15min, 30min, 1hour, or 1day." });
//         }

//         reminderTime = new Date(start.getTime() + reminderMap[reminder] * 60 * 1000);
//       }

//       // 🔹 10. Create a new activity
//       const newActivity = new Activity({
//         title,
//         description,
//         startDate: start,
//         endDate: end,
//         startTime,
//         endTime,
//         activityCategory,
//         activityType,
//         activityModel,
       
//         collaborators,
//         reminder: reminderTime || null,
//       });

//       const savedActivity = await newActivity.save();

//       console.log("New Activity Created:", savedActivity);

//      res.status(201).json({
//   message: "Activity added successfully",
//   _id: savedActivity._id, 
//   data: savedActivity,
// });

//     } catch (error) {
//       console.error("Error adding activity:", error);
//       res.status(500).json({ message: "Error adding activity" });
//     }
//   },

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
      activityType,
      activityModel,
      collaborators = [],
      reminder,
    } = req.body;

    // Optional date parsing and validation
    let start = null, end = null;
    if (startDate) {
      start = new Date(startDate);
      if (isNaN(start.getTime())) {
        return res.status(400).json({ message: "Invalid startDate format." });
      }
    }
    if (endDate) {
      end = new Date(endDate);
      if (isNaN(end.getTime())) {
        return res.status(400).json({ message: "Invalid endDate format." });
      }
    }

    if (start && end && end < start) {
      return res.status(400).json({ message: "End date must be after start date." });
    }

    // Optional time validation
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
    if (startTime && !timeRegex.test(startTime)) {
      return res.status(400).json({ message: "Invalid startTime format. Use HH:mm." });
    }
    if (endTime && !timeRegex.test(endTime)) {
      return res.status(400).json({ message: "Invalid endTime format. Use HH:mm." });
    }

    if (
      start && end &&
      start.toDateString() === end.toDateString() &&
      startTime && endTime &&
      startTime >= endTime
    ) {
      return res.status(400).json({ message: "End time must be after start time." });
    }

    // Validate category only if present
    const validCategories = ["Call", "Meeting", "Email", "Task", "Deadline", "Other"];
    if (activityCategory && !validCategories.includes(activityCategory)) {
      return res.status(400).json({ message: "Invalid activity category." });
    }

    // Validate model type
    const validModels = ["Deal", "Person", "Organization"];
    if (activityModel && !validModels.includes(activityModel)) {
      return res.status(400).json({ message: "Invalid activity model." });
    }

    // Validate activityType ObjectId
    if (activityType && !mongoose.Types.ObjectId.isValid(activityType)) {
      return res.status(400).json({ message: "Invalid ObjectId format for activityType." });
    }

    // Validate that related model exists
    let modelExists = null;
    if (activityModel && activityType) {
      if (activityModel === "Deal") {
        modelExists = await AllDeals.findById(activityType);
      } else if (activityModel === "Person") {
        modelExists = await Person.findById(activityType);
      } else if (activityModel === "Organization") {
        modelExists = await Organization.findById(activityType);
      }

      if (!modelExists) {
        return res.status(404).json({ message: `${activityModel} with the given ID not found.` });
      }
    }

    // Handle reminder if present
    let reminderTime = null;
    if (reminder) {
      const reminderMap = {
        "15min": -15,
        "30min": -30,
        "1hour": -60,
        "1day": -1440,
      };

      if (!reminderMap.hasOwnProperty(reminder)) {
        return res.status(400).json({ message: "Invalid reminder option." });
      }

      if (!start) {
        return res.status(400).json({ message: "Reminder requires startDate." });
      }

      reminderTime = new Date(start.getTime() + reminderMap[reminder] * 60 * 1000);
    }

    // Create the activity with only what's given
    const newActivity = new Activity({
      ...(title && { title }),
      ...(description && { description }),
      ...(start && { startDate: start }),
      ...(end && { endDate: end }),
      ...(startTime && { startTime }),
      ...(endTime && { endTime }),
      ...(activityCategory && { activityCategory }),
      ...(activityType && { activityType }),
      ...(activityModel && { activityModel }),
      ...(collaborators && { collaborators }),
      reminder: reminderTime,
    });

    const savedActivity = await newActivity.save();

    console.log("New Activity Created:", savedActivity);

    res.status(201).json({
      message: "Activity added successfully",
      _id: savedActivity._id,
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
      const { startDate, endDate } = req.body;

      // 🔹 Validate Dates
      if (startDate && endDate) {
        const startDateTime = new Date(startDate);
        const endDateTime = new Date(endDate);

        if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
          return res.status(400).json({ message: "Invalid date format for startDate or endDate." });
        }

        if (startDateTime >= endDateTime) {
          return res.status(400).json({ message: "End date must be after start date." });
        }
      }

      const updatedActivity = await Activity.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });

      if (!updatedActivity) {
        return res.status(404).json({ message: "Activity not found" });
      }

      res.status(200).json({ message: "Activity updated successfully", data: updatedActivity });
    } catch (error) {
      console.error("Error updating activity:", error);
      res.status(500).json({ message: "Error updating activity" });
    }
  },

  deleteActivity: async (req, res) => {
    try {
      const { id } = req.params;
      console.log("Backend delete request ID:", id); // Log here
      const deletedActivity = await Activity.findByIdAndDelete(id);
  
      if (!deletedActivity) {
        return res.status(404).json({ message: "Activity not found" });
      }
  
      res.status(200).json({ message: "Activity deleted successfully" });
    } catch (error) {
      console.error("Error deleting activity:", error);
      res.status(500).json({ message: "Error deleting activity" });
    }
  }
}
  
