// import Role from "../models/role.model.js";

// export default {
//   createRole: async (req, res) => {
//     try {
//       const role = await Role.create(req.body);
//       res.status(201).json(role);
//     } catch (err) {
//       res.status(500).json({ message: err.message });
//     }
//   },

//   getRoles: async (req, res) => {
//     try {
//       const roles = await Role.find();
//       res.json(roles);
//     } catch (err) {
//       res.status(500).json({ message: err.message });
//     }
//   },
// };


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
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const roles = await Role.find()
        .skip(skip)
        .limit(limit);
      
      const total = await Role.countDocuments();

      res.json({
        roles,
        total,
        page,
        pages: Math.ceil(total / limit)
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  updateRole: async (req, res) => {
    try {
      const { id } = req.params;
      const updatedRole = await Role.findByIdAndUpdate(id, req.body, { new: true });
      
      if (!updatedRole) {
        return res.status(404).json({ message: "Role not found" });
      }

      res.json(updatedRole);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  deleteRole: async (req, res) => {
    try {
      const { id } = req.params;
      const deletedRole = await Role.findByIdAndDelete(id);
      
      if (!deletedRole) {
        return res.status(404).json({ message: "Role not found" });
      }

      res.json({ message: "Role deleted successfully" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
};