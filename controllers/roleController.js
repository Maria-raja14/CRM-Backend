import Role from "../models/Role.models";
export default {
  createRole: async (req, res) => {
    try {
      const { name, permissions } = req.body;
      const role = new Role({ name, permissions });
      await role.save();
      res.status(201).json(role);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // Get all roles
  getRoles: async (req, res) => {
    const roles = await Role.find();
    res.json(roles);
  },

  // Update a role
  updateRole: async (req, res) => {
    try {
      const { name, permissions } = req.body;
      const role = await Role.findByIdAndUpdate(
        req.params.id,
        { name, permissions },
        { new: true }
      );
      res.json(role);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // Delete a role
  deleteRole: async (req, res) => {
    await Role.findByIdAndDelete(req.params.id);
    res.json({ message: "Role deleted" });
  },
};
