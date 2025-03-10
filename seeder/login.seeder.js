import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import User from "../models/user.model.js"; 
import connectDB from "../config/db.js"; 
import adminUsers from "./index.seeder.js";

dotenv.config();

const seedAdminUsers = async () => {
    try {
        console.log(" Connecting to MongoDB...");
        await connectDB(); 
        await mongoose.connection.asPromise();
        console.log(" MongoDB is Ready");

       
        const existingAdmins = await User.find({ role: "Admin" });
        if (existingAdmins.length > 0) {
            console.log("Admin users already exist");
            process.exit(0);
        }

       
        const hashedUsers = await Promise.all(
            adminUsers.map(async (user) => ({
                ...user,
                password: await bcrypt.hash(user.password, 10),
            }))
        );

      
        await User.insertMany(hashedUsers);
        console.log(" Admin users created successfully");
        process.exit(0);
    } catch (error) {
        console.error("Error seeding admin users:", error);
        process.exit(1);
    }
};


seedAdminUsers();
