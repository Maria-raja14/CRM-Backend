import mongoose from 'mongoose'

const Meeting = new mongoose.Schema({
    salesperson: { type: String, required: true }, 
  clientName: { 
    type: String,
     required: true },
  clientEmail: { 
    type: String, 
    required: false },
  purpose: { 
    type: String, 
    required: true },
  startedAt: {
     type: Date, 
     required: true 
    },
  durationInSeconds: {
     type: Number, 
     required: true },
     attended: { type: Boolean, default: false }, 
}, { timestamps: true });

export default mongoose.model("Meeting", Meeting);




