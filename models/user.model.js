import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    gender: { type: String, required: true },
    profilePhoto: { type: String },
    mobileNumber: { type: String, required: true },
    address: { type: String, required: true },
    email: { type: String, required: true, unique: true } 
}, { timestamps: true });

const User = mongoose.model("User", UserSchema);
export default User;
