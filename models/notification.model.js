// models/notification.model.js
import mongoose from "mongoose";

const Notification = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["followup", "activity", "deal", "admin", "activity_reminder"], // ✅ fixed
      default: "followup",
    },
    text: { type: String, required: true },
    read: { type: Boolean, default: false },
    meta: { type: Object }, // Optional: e.g., leadId, followUpAt
    expiresAt: { type: Date }, // ✅ New field
  },
  { timestamps: true }
);

export default mongoose.model("Notification", Notification);
