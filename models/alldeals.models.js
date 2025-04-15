import mongoose from 'mongoose';

const AllDealsSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: true
    },
    description: { 
        type: String,
        required: true 
    },
    leadType: { 
        type: String,
        enum: ["person", "organization"],
        required: true
    },
    personId: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Person'
    },
    organizationId: { // Fixed name from OrganizationId to organizationId
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization'
    },
    dealsValue: { 
        type: Number, 
        required: true
    },
    stage: { 
        type: String, 
        enum: ["Visit Scheduled", "Visit Completed", "Customer No Show"], // Fixed enum case sensitivity
        required: true 
    },
    expectingClosingDate: { 
        type: Date, 
        required: true
    },
    owner: { 
        type: String, 
        required: true
    }
}, { timestamps: true });

const AllDeals = mongoose.model('AllDeals', AllDealsSchema);
export default AllDeals;
