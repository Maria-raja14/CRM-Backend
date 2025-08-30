// models/notification.model.js
import mongoose from "mongoose";

const Notification = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["followup", "activity", "deal", "admin"],
      default: "followup",
    },
    text: { type: String, required: true },
    read: { type: Boolean, default: false },
    meta: { type: Object }, // Optional: e.g., leadId, followUpAt
  },
  { timestamps: true }
);

export default mongoose.model("Notification", Notification);
