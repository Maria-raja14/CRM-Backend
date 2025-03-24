import mongoose from "mongoose";

const ownerSchema = new mongoose.Schema({
  name: { type: String, required: true },
});

const owner =mongoose.model("Owner", ownerSchema)
export default owner
// export default mongoose.model("Owner", ownerSchema);

// const Role = mongoose.model("Role", RoleSchema);
// export default Role;