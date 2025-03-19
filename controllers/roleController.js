import Role from "../models/Role.models.js";
import User from "../models/user.model.js";

export default {
  createRole: async (req, res) => {
    try {
      const { name, permissions = [] } = req.body; // Default permissions to an empty array if not provided
      const {userId}=req.params;
      console.log("userId",userId);
      if (!name) {
        return res.status(400).json({ error: "Role name is required" });
      }
      
      const role = new Role({ name, permissions,userId });
      await role.save();
      
      res.status(201).json(role);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  

    getRoles: async (req, res) => {
    try {
      const roles = await Role.find().populate("users"); // Fetch users with selected fields
      console.log(roles); 
      res.json(roles);
      
      
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  
  // Update a role
  updateRole: async (req, res) => {
    try {
      const { users } = req.body;
      
      // Ensure users is an array
      if (!users || !Array.isArray(users)) {
        return res.status(400).json({ error: "Users must be an array" });
      }
  
      // const role = await Role.findByIdAndUpdate(
      //   req.params.id,
      //   { $addToSet: { users: { $each: users.map(user => user._id) } } },
      //   { new: true }
      // ).populate("users");
      const role = await Role.findByIdAndUpdate(
        req.params.id,
        { $addToSet: { users: { $each: users } } }, // `users` already contains IDs
        { new: true }
      ).populate("users");
      
  
      if (!role) {
        return res.status(404).json({ error: "Role not found" });
      }
  
      res.json(role);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  

  
  
 


  // Get Users by Role Name
  getUsersByRole: async (req, res) => {
    try {
      const { roleName } = req.params;
  
      const role = await Role.findOne({ name: roleName }).populate("users", "firstName lastName email profilePhoto");
      if (!role) {
        return res.status(404).json({ message: "Role not found" });
      }
  
      res.json({ roleName: role.name, users: role.users });
    } catch (error) {
      res.status(500).json({ message: "Server Error", error: error.message });
    }
  },


  
  

  // Delete a role
  deleteRole: async (req, res) => {
    await Role.findByIdAndDelete(req.params.id);
    console.log(req.params.id);
    
    res.json({ message: "Role deleted" });
  },
};
