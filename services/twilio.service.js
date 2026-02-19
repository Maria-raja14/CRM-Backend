// import twilio from 'twilio';
// import dotenv from 'dotenv';

// dotenv.config();

// const accountSid = process.env.TWILIO_ACCOUNT_SID;
// const authToken = process.env.TWILIO_AUTH_TOKEN;
// const client = twilio(accountSid, authToken);

// export const sendWhatsAppMessage = async ({ to, contentVariables }) => {
//   try {
//     const message = await client.messages.create({
//       from: process.env.TWILIO_WHATSAPP_FROM,
//       to: `whatsapp:${to}`,
//       contentSid: process.env.TWILIO_CONTENT_SID,
//       contentVariables: JSON.stringify(contentVariables)
//     });

//     return {
//       success: true,
//       messageSid: message.sid,
//       status: message.status,
//       body: message.body
//     };
//   } catch (error) {
//     console.error('Twilio Error:', error);
//     return {
//       success: false,
//       error: error.message
//     };
//   }
// };

// // Webhook handler for incoming messages
// export const handleIncomingMessage = async (req, res) => {
//   const { Body, From, To, MessageSid } = req.body;
  
//   console.log('📩 Incoming WhatsApp:', { Body, From, To });
  
//   // Store in database
//   // Trigger notifications
//   // Emit via socket
  
//   res.status(200).send('OK');
// };


import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

export const sendWhatsAppMessage = async ({ to, contentVariables }) => {
  try {
    // Format phone number (remove any special characters)
    const cleanNumber = to.replace(/[^0-9]/g, '');
    
    // Ensure it's in international format with country code
    const formattedTo = `whatsapp:+${cleanNumber}`;
    
    console.log('📤 Sending WhatsApp to:', formattedTo);
    console.log('📤 Content Variables:', contentVariables);

    const message = await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: formattedTo,
      contentSid: process.env.TWILIO_CONTENT_SID,
      contentVariables: JSON.stringify(contentVariables)
    });

    console.log('✅ Message sent:', message.sid);
    
    return {
      success: true,
      messageSid: message.sid,
      status: message.status,
      body: message.body
    };
  } catch (error) {
    console.error('❌ Twilio Error Details:', {
      code: error.code,
      message: error.message,
      moreInfo: error.moreInfo
    });
    
    return {
      success: false,
      error: error.message,
      code: error.code
    };
  }
};

// Webhook handler for incoming messages
export const handleIncomingMessage = async (req, res) => {
  const { Body, From, To, MessageSid } = req.body;
  
  console.log('📩 Incoming WhatsApp:', { 
    from: From, 
    body: Body,
    to: To,
    sid: MessageSid 
  });
  
  // Store in database
  // Emit via socket for real-time updates
  
  res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
};