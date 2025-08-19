// import mongoose from "mongoose";

// const leadSchema = new mongoose.Schema(
//   {
//     leadName: { type: String, required: true },
//     phoneNumber: { type: String, required: true },
//     email: { type: String },
//     source: { type: String },
//     companyName: { type: String },
//     industry: { type: String },
//     requirement: { type: String },

//     assignTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
//     address: { type: String },
//     status: {
//       type: String,
//       enum: ["Hot", "Warm", "Cold", "Junk"],
//       default: "Cold",
//     },
//     // use this as "next follow-up"
//     followUpDate: { type: Date },

//     // NEW: last reminder timestamp
//     lastReminderAt: { type: Date },
//     notes: { type: String },
//     // ✅ New custom field
//   },
//   { timestamps: true }
// );

// // Optional: index for scanning upcoming reminders faster
// leadSchema.index({ followUpDate: 1 });

// const Lead = mongoose.model("Lead", leadSchema);
// export default Lead;




import mongoose from "mongoose";

const leadSchema = new mongoose.Schema(
  {
    leadName: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    email: { type: String },
    source: { type: String },
    companyName: { type: String, required: true },
    industry: { type: String },
    requirement: { type: String },

    assignTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    address: { type: String },

    status: {
      type: String,
      enum: ["Hot", "Warm", "Cold", "Junk", "Converted"],
      default: "Cold",
    },

    // next follow-up trigger
    followUpDate: { type: Date },

    // last time we reminded (to avoid duplicate sends)
    lastReminderAt: { type: Date },

    notes: { type: String },
  },
  { timestamps: true }
);

// For scanning follow-ups quickly
leadSchema.index({ followUpDate: 1 });

const Lead = mongoose.model("Lead", leadSchema);
export default Lead;
