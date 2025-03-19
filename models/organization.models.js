import mongoose from "mongoose";

const OrganizationSchema = new mongoose.Schema({
    organizationName: {
        type: String,
        required: true,
        trim: true
    },
    leadGroup: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "LeadGroup", 
        required: true
    },
    owner: {
        type: String,
        required: true,
        trim: true
    },
    addressDetails: {
        country: { type: String, required: true },
        area: { type: String },
        city: { type: String, required: true },
        state: { type: String, required: true },
        zipCode: { type: String }
    },
    customFields: {
        type: Map,
        of: String 
    },
/*     created_by_email: { type: String, required: true }, */
   /*  owner_email: { type: String, required: true }, */
});

const Organization = mongoose.model("Organization", OrganizationSchema);
export default Organization;
