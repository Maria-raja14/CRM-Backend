import mongoose from "mongoose";

const LeadGroupSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true, 
    },
    leadClass: { 
        type: String,
        enum: ["primary", "success", "secondary", "danger", "purple", "warning", "info", "light", "dark", "link"], 
        default: "primary",
        lowercase: true, 
    }
});

const LeadGroup = mongoose.model("LeadGroup", LeadGroupSchema);
export default LeadGroup;
