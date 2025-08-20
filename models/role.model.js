import mongoose from "mongoose";

const roleSchema = new mongoose.Schema(
  {

    name: { type: String, required: true, unique: true },

    description: { type: String },
    permissions: {
      dashboard: { type: Boolean, default: true },
      leads: { type: Boolean, default: true },
      deals: { type: Boolean, default: true },
      deals_all: { type: Boolean, default: true },
      deals_pipeline: { type: Boolean, default: true },
      invoices: { type: Boolean, default: true },
      proposal: { type: Boolean, default: true },
      proposal_list: { type: Boolean, default: true },
      proposal_templates: { type: Boolean, default: true },
      activities: { type: Boolean, default: true },
      activities_calendar: { type: Boolean, default: true },
      activities_list: { type: Boolean, default: true },
      expenses: { type: Boolean, default: true },
      expenses_all: { type: Boolean, default: true },
      expenses_area: { type: Boolean, default: true },
      reports: { type: Boolean, default: true },
      reports_deals: { type: Boolean, default: true },
      reports_proposal: { type: Boolean, default: true },
      reports_pipeline: { type: Boolean, default: true },
      reports_payment: { type: Boolean, default: true },
      admin_access: { type: Boolean, default: true },
    },

  },
  { timestamps: true }
);

// ✅ Prevent OverwriteModelError
export default mongoose.models.Role || mongoose.model("Role", roleSchema);



