import mongoose from "mongoose";

const roleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String }
  },
  { timestamps: true }
);

// ✅ Prevent OverwriteModelError
export default mongoose.models.Role || mongoose.model("Role", roleSchema);


