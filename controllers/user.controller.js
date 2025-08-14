


// import User from "../models/user.model.js";
// import jwt from "jsonwebtoken";
// import dotenv from "dotenv";

// dotenv.config();
// const SECRET_KEY = process.env.JWT_SECRET; // <-- load from .env

// const generateToken = (id) => {
//   return jwt.sign({ id }, SECRET_KEY, { expiresIn: "1d" });
// };

// export default {
//   createUser: async (req, res) => {
//     try {
//       const user = await User.create(req.body);
//       res.status(201).json(user);
//     } catch (err) {
//       res.status(500).json({ message: err.message });
//     }
//   },

//   getUsers: async (req, res) => {
//     try {
//       const users = await User.find().populate("role");
//       res.json(users);
//     } catch (err) {
//       res.status(500).json({ message: err.message });
//     }
//   },

//   loginUser: async (req, res) => {
//   try {
//     const { email, password } = req.body;
//     console.log(req.body);
    
//     const user = await User.findOne({ email }).populate("role");
//     console.log("role",user);
    

//     if (!user || !(await user.matchPassword(password))) {
//       return res.status(401).json({ message: "Invalid credentials" });
//     }

//     res.json({
//       message: "Login successful",
//       _id: user._id,
//       name: `${user.firstName} ${user.lastName}`,
//       email: user.email,
//       role: user.role.name,
//       token: generateToken(user._id),
//     });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// }
// ,
// };



import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();
// const SECRET_KEY = process.env.SECRET_KEY; // make sure .env has JWT_SECRET=yourSecret

const generateToken = (id) => jwt.sign({ id }, process.env.SECRET_KEY, { expiresIn: "1d" });

export default {

 createUser: async (req, res) => {
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

    // Handle file upload for profileImage (if using multer)
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
    res.status(500).json({ message: err.message });
  }
}
,

  getUsers: async (req, res) => {
    try {
      const users = await User.find().populate("role");
      res.json(users);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  loginUser: async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email }).populate("role");

      // ✅ use matchPassword (as defined in your model)
      if (!user || !(await user.matchPassword(password))) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      res.json({
        message: "Login successful",
        _id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: user.role?.name || null,
        token: generateToken(user._id),
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
};
