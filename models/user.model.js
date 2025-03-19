import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const UserSchema = new mongoose.Schema(
  {
    firstName: { type: String, requir     : true },
    lastName: { type: String, required: true },
    gender: { type: String, required: true },
    DateOB: { type: String },
    profilePhoto: { type: String },
    mobileNumber: { type: String, required: true, unique: true },
    address: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, minlength: 6 },
    roleId: { type: mongoose.Schema.Types.ObjectId, ref: "Role" },
    status: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ✅ Hash password before saving (Keep this, remove hashing from signup)
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

const User = mongoose.model("User", UserSchema);
export default User;
