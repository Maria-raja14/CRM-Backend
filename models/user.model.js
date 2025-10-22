// import mongoose from "mongoose";
// import bcrypt from "bcryptjs";

// const userSchema = new mongoose.Schema({
//     firstName: { type: String, required: true },
//     lastName: { type: String, required: true },
//     email: { type: String, required: true },
//     password: { type: String, required: true, minlength: 6 },
//     mobileNumber: { type: String },

//     role: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "Role",
//         required: true
//     },
//     status: { type: String, enum: ["Active", "Inactive"], default: "Active" },

//     // Extra fields
//     gender: {
//         type: String,
//         enum: ["Male", "Female", "Other"],
//         default: "Other"
//     },
//     address: {
//       type: String
//     },
//     dateOfBirth: { type: Date },
//     profileImage: { type: String }
// }, { timestamps: true });

// // Hash password before saving
// userSchema.pre("save", async function (next) {
//     if (!this.isModified("password")) return next();
//     const salt = await bcrypt.genSalt(10);
//     this.password = await bcrypt.hash(this.password, salt);
//     next();
// });

// // Compare entered password with hashed password
// userSchema.methods.matchPassword = async function (enteredPassword) {
//     return await bcrypt.compare(enteredPassword, this.password);
// };

// export default mongoose.model("User", userSchema);//original


import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const userSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true, minlength: 6 },
    mobileNumber: { type: String },
    role: { type: mongoose.Schema.Types.ObjectId, ref: "Role", required: true },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    gender: { type: String, enum: ["Male", "Female", "Other"], default: "Other" },
    address: { type: String },
    dateOfBirth: { type: Date },
    profileImage: { type: String },
name: { type: String },
  loginHistory: [
      {
        login: { type: Date },
        logout: { type: Date },
      }
    ],
    resetPasswordToken: String,
    resetPasswordExpire: Date
}, { timestamps: true });

// Hash password
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compare entered password
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Generate password reset token
userSchema.methods.getResetPasswordToken = function () {
    const resetToken = crypto.randomBytes(20).toString("hex");

    this.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 mins

    return resetToken;
};

export default mongoose.model("User", userSchema);


