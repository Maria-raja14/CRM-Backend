import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6 
    },
    role: {
        type: String,
        enum: ["Admin", "Sales", "Manager", "User"], // Role-based access
        default: "User"
    },
    createdAt: { 
        type: Date,
        default: Date.now 
    }
});


const User= mongoose.model("User", userSchema);
export default  User;