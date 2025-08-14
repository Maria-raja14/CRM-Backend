import Role from "../models/role.model.js";

export default {
  createRole: async (req, res) => {
    try {
      const role = await Role.create(req.body);
      res.status(201).json(role);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  getRoles: async (req, res) => {
    try {
      const roles = await Role.find();
      res.json(roles);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
};
