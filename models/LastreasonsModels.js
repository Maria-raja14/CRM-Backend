import mongoose from "mongoose";

const nameSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
});

const name= mongoose.model("Name" , nameSchema)
export default name

// module.exports = mongoose.model("Name", nameSchema);

// const Role = mongoose.model("Role", RoleSchema);
// export default Role;
