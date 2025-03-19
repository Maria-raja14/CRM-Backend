import mongoose from "mongoose";

const RoleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  permissions: { type: [String], default: [] },
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }] // ✅ Add this line
});

const Role = mongoose.model("Role", RoleSchema);
export default Role;
