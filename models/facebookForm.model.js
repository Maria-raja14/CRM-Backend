import mongoose from 'mongoose';

const facebookLeadSchema = new mongoose.Schema(
  {
    leadName:        { type: String, trim: true, default: '' },
    phoneNumber:     { type: String, trim: true, default: '' },
    email:           { type: String, trim: true, lowercase: true, default: '' },
    source:          { type: String, default: 'Facebook' },
    destination:     { type: String, trim: true, default: '' },
    duration:        { type: String, trim: true, default: '' },
    requirement:     { type: String, trim: true, default: '' },
    address:         { type: String, trim: true, default: '' },
    country:         { type: String, trim: true, default: '' },
    noOfTravellers:  { type: Number, min: 1, default: null },
    travelDate:      { type: Date, default: null },
    notes:           { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('FacebookForm', facebookLeadSchema);