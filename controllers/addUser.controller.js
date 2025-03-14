// const User = require('../models/addUser.model.js');
import User from "../models/user.model.js"

export default {
    createUser : async (req, res) => {
      try {
        const newUser = new User(req.body);
        console.log(newUser);
        
        await newUser.save();
        res.status(201).json(newUser);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    },
    
    getUsers : async (req, res) => {
      try {
        const users = await User.find();
        res.status(200).json(users);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    }
}