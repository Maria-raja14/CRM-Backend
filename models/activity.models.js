import mongoose from "mongoose";

const activitySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    startDate: { type: Date, required: true }, // ⬅️ Start date added
    endDate: { type: Date, required: true }, // ⬅️ End date added
    startTime: { type: String, required: true, match: /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/ },
    endTime: { type: String, required: true, match: /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/ },
    activityCategory: {
      type: String,
      required: true,
      enum: ["Call", "Meeting", "Email", "Task", "Deadline", "Other"], 
    },
    activityType: {
      type: mongoose.Schema.Types.ObjectId, 
      refPath: "activityModel", 
      required: function () { return !!this.activityModel; },  // Only required if activityModel exists
    },
    
    activityModel: {
      type: String,
      required: true,
      enum: ["Deals", "Person", "Organization"], 
    },
    collaborators: [{ type: mongoose.Schema.Types.ObjectId, ref: "Person" }],
    reminder: {
      type: Date,
    },
  },
  { timestamps: true }
);

const Activity = mongoose.model("Activity", activitySchema);
export default Activity;
