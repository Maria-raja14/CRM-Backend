import mongoose from 'mongoose';

const facebookLeadSchema = new mongoose.Schema(
  {
    leadName:        { type: String, trim: true },
    phoneNumber:     { type: String, trim: true },
    email:           { type: String, trim: true, lowercase: true },
    source:          { type: String, default: 'Facebook' },
    destination:     { type: String, trim: true },
    duration:        { type: String, trim: true },
    requirement:     { type: String, trim: true },
    address:         { type: String, trim: true },
    country:         { type: String, trim: true },
    noOfTravellers:  { type: Number, min: 1 },
    travelDate:      { type: Date },
    notes:           { type: String, trim: true },
  },
  { timestamps: true }
);

export default mongoose.model('FacebookForm', facebookLeadSchema);