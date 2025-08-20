// import User from "../models/user.model.js";
// import jwt from "jsonwebtoken";
// import dotenv from "dotenv";

// dotenv.config();
// // const SECRET_KEY = process.env.SECRET_KEY; // make sure .env has JWT_SECRET=yourSecret

// const generateToken = (id) => jwt.sign({ id }, process.env.SECRET_KEY, { expiresIn: "1d" });

// export default {

//  createUser: async (req, res) => {
//   try {
//     const {
//       firstName,
//       lastName,
//       email,
//       password,
//       mobileNumber,
//       role,
//       status,
//       gender,
//       address,
//       dateOfBirth
//     } = req.body;

//     // Handle file upload for profileImage (if using multer)
//     const profileImage = req.file ? req.file.path : null;

//     const user = await User.create({
//       firstName,
//       lastName,
//       email,
//       password,
//       mobileNumber,
//       role,
//       status,
//       gender,
//       address,
//       dateOfBirth,
//       profileImage
//     });

//     res.status(201).json(user);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// }
// ,

//   getUsers: async (req, res) => {
//     try {
//       const users = await User.find().populate("role");
//       res.json(users);
//     } catch (err) {
//       res.status(500).json({ message: err.message });
//     }
//   },

//   loginUser: async (req, res) => {
//     try {
//       const { email, password } = req.body;

//       const user = await User.findOne({ email }).populate("role");

//       // ✅ use matchPassword (as defined in your model)
//       if (!user || !(await user.matchPassword(password))) {
//         return res.status(401).json({ message: "Invalid credentials" });
//       }

//       res.json({
//         message: "Login successful",
//         _id: user._id,
//         name: `${user.firstName} ${user.lastName}`,
//         email: user.email,
//         role: user.role?.name || null,
//         token: generateToken(user._id),
//       });
//     } catch (err) {
//       res.status(500).json({ message: err.message });
//     }
//   },
  
// };



import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const generateToken = (id) => jwt.sign({ id }, process.env.SECRET_KEY, { expiresIn: "1d" });

export default {
  // createUser: async (req, res) => {
  //   try {
  //     const {
  //       firstName,
  //       lastName,
  //       email,
  //       password,
  //       mobileNumber,
  //       role,
  //       status,
  //       gender,
  //       address,
  //       dateOfBirth
  //     } = req.body;

  //     const profileImage = req.file ? req.file.path : null;

  //     const user = await User.create({
  //       firstName,
  //       lastName,
  //       email,
  //       password,
  //       mobileNumber,
  //       role,
  //       status,
  //       gender,
  //       address,
  //       dateOfBirth,
  //       profileImage
  //     });

  //     res.status(201).json(user);
  //   } catch (err) {
  //     res.status(500).json({ message: err.message });
  //   }
  // },

createUser : async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      mobileNumber,
      role,
      status,
      gender,
      address,
      dateOfBirth
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      // Remove uploaded file if user already exists
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ message: "User already exists with this email" });
    }

    const profileImage = req.file ? req.file.path : null;

    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      mobileNumber,
      role,
      status,
      gender,
      address,
      dateOfBirth,
      profileImage
    });

    res.status(201).json(user);
  } catch (err) {
    // Remove uploaded file if error occurs
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: err.message });
  }
},

  getUsers: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const users = await User.find().populate("role")
        .skip(skip)
        .limit(limit);
      
      const total = await User.countDocuments();

      res.json({
        users,
        total,
        page,
        pages: Math.ceil(total / limit)
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  // updateUser: async (req, res) => {
  //   try {
  //     const { id } = req.params;
  //     const updateData = req.body;

  //     if (req.file) {
  //       updateData.profileImage = req.file.path;
  //     }

  //     const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true }).populate("role");
      
  //     if (!updatedUser) {
  //       return res.status(404).json({ message: "User not found" });
  //     }

  //     res.json(updatedUser);
  //   } catch (err) {
  //     res.status(500).json({ message: err.message });
  //   }
  // },

 updateUser : async (req, res) => {
  try {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      email,
      mobileNumber,
      role,
      status,
      gender,
      address,
      dateOfBirth
    } = req.body;

    // Find user
    const user = await User.findById(id);
    if (!user) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ message: "User not found" });
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({ message: "Email already taken" });
      }
    }

    // If new image is uploaded, delete the old one
    let profileImage = user.profileImage;
    if (req.file) {
      // Delete old image if it exists
      if (user.profileImage && fs.existsSync(user.profileImage)) {
        fs.unlinkSync(user.profileImage);
      }
      profileImage = req.file.path;
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      id,
      {
        firstName,
        lastName,
        email,
        mobileNumber,
        role,
        status,
        gender,
        address,
        dateOfBirth,
        profileImage
      },
      { new: true, runValidators: true }
    ).populate("role");

    res.json(updatedUser);
  } catch (err) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: err.message });
  }
},


  deleteUser: async (req, res) => {
    try {
      const { id } = req.params;
      const deletedUser = await User.findByIdAndDelete(id);
      
      if (!deletedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ message: "User deleted successfully" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  // loginUser: async (req, res) => {
  //   try {
  //     const { email, password } = req.body;
  //     const user = await User.findOne({ email }).populate("role");

  //     if (!user || !(await user.matchPassword(password))) {
  //       return res.status(401).json({ message: "Invalid credentials" });
  //     }

  //     res.json({
  //       message: "Login successful",
  //       _id: user._id,
  //       name: `${user.firstName} ${user.lastName}`,
  //       email: user.email,
  //       role: user.role?.name || null,
  //       token: generateToken(user._id),
  //     });
  //   } catch (err) {
  //     res.status(500).json({ message: err.message });
  //   }
  // },

loginUser: async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email })
      .populate("role")
      .select("+password");

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    res.json({
      message: "Login successful",
      _id: user._id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      role: {
        _id: user.role._id,
        name: user.role.name,
        permissions: user.role.permissions
      }, // Send the full role object with name and permissions
      token: generateToken(user._id),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
},


};