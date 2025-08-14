



import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, minlength: 6 },
    mobileNumber: { type: String, unique: true, sparse: true },

    role: { type: mongoose.Schema.Types.ObjectId, ref: "Role", required: true },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },


    // 🆕 Extra fields
    gender: {
        type: String,
        enum: ["Male", "Female", "Other"], // restricts to these values
        default: "Other"
    },
    address: {
      type: String 
      
    },
    dateOfBirth: { type: Date },
    profileImage: { type: String } // store image URL or file path
}, { timestamps: true });

// Hash password before saving
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compare entered password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model("User", userSchema);
