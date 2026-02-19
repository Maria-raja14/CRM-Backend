import mongoose from 'mongoose';

const whatsappMessageSchema = new mongoose.Schema({
  to: { type: String, required: true },
  from: { type: String, required: true },
  body: { type: String },
  contentSid: { type: String },
  contentVariables: { type: Object },
  status: { type: String, default: 'queued' },
  messageSid: { type: String, unique: true },
  direction: { type: String, enum: ['outbound', 'inbound'] },
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  dealId: { type: mongoose.Schema.Types.ObjectId, ref: 'Deal' },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('WhatsAppMessage', whatsappMessageSchema);