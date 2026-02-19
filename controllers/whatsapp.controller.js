import { sendWhatsAppMessage } from '../services/twilio.service.js';
import WhatsAppMessage from '../models/WhatsAppMessage.js';

export const sendMessage = async (req, res) => {
  try {
    const { phoneNumber, contentVariables, leadId, dealId } = req.body;
    
    // Remove 'whatsapp:' prefix if present
    const cleanNumber = phoneNumber.replace('whatsapp:', '');
    
    const result = await sendWhatsAppMessage({
      to: cleanNumber,
      contentVariables
    });

    if (result.success) {
      // Save to database
      const message = new WhatsAppMessage({
        to: cleanNumber,
        from: process.env.TWILIO_WHATSAPP_FROM,
        body: result.body,
        messageSid: result.messageSid,
        status: result.status,
        direction: 'outbound',
        leadId,
        dealId,
        contentVariables
      });
      await message.save();

      return res.status(201).json({
        success: true,
        message: 'WhatsApp message sent',
        data: message
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Send Message Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getMessageHistory = async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    const messages = await WhatsAppMessage.find({
      $or: [
        { to: phoneNumber },
        { from: phoneNumber }
      ]
    }).sort({ createdAt: -1 });
    
    res.json({ success: true, data: messages });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Add at the end of the file
export default {
  sendMessage,
  getMessageHistory
};