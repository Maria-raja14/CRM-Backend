// import mongoose from "mongoose";

// const ProfileSchema = new mongoose.Schema({
//     firstName: String,
//     lastName: String,
//     email: String,
//     gender: String,
//     phone: String,
//     address: String,
//     dob: String,
// }, { timestamps: true });

// export default mongoose.model("Profile", ProfileSchema);


import mongoose from "mongoose";

const ProfileSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    email: { type: String, required: true, unique: true },
    gender: String,
    phone: String,
    address: String,
    dob: String,
}, { timestamps: true });

export default mongoose.model("Profile", ProfileSchema);
