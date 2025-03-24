import mongoose from "mongoose";

const PersonSchema = new mongoose.Schema({
    personName: {
        type: String,
        required: true,
        trim: true
    },
    leadGroup: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "LeadGroup",
        required: true
    },
    organization: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Organization",
        required: true
    },
    contactInfo: [
        {
            type: {
                type: String,
                enum: ["Work", "Home", "Office"],
                required: true
            },
            phone: { type: String },
            email: { type: String }
        }
    ],
    owner: {
        type: String,
        required: true,
        trim: true
    },
    customFields: {
        cardlead: { type: String, default: null },
        admin: { type: String, default: null },
        dbut: { type: String, default: null },
        fin: { type: String, default: null },
    }
});

const Person = mongoose.model("Person", PersonSchema);

export default Person;
