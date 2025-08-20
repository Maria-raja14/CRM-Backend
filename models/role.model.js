// import mongoose from "mongoose";

// const roleSchema = new mongoose.Schema(
//   {
//     name: { type: String, required: true, unique: true },
//     description: { type: String }
//   },
//   { timestamps: true }
// );

// // ✅ Prevent OverwriteModelError
// export default mongoose.models.Role || mongoose.model("Role", roleSchema);



import mongoose from "mongoose";

const roleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    permissions: {
      dashboard: { type: Boolean, default: false },
      leads: { type: Boolean, default: false },
      deals: { type: Boolean, default: false },
      pipeline: { type: Boolean, default: false },
      invoice: { type: Boolean, default: false },
      proposal: { type: Boolean, default: false },
      templates: { type: Boolean, default: false },
      calendar: { type: Boolean, default: false },
      activityList: { type: Boolean, default: false },
      expenses: { type: Boolean, default: false },
      areaExpenses: { type: Boolean, default: false },
      dealReports: { type: Boolean, default: false },
      proposalReports: { type: Boolean, default: false },
      pipelineReports: { type: Boolean, default: false },
      paymentHistory: { type: Boolean, default: false },
      usersRoles: { type: Boolean, default: false },
    }
  },
  { timestamps: true }
);

// Remove unique constraint to allow duplicate names
export default mongoose.models.Role || mongoose.model("Role", roleSchema);