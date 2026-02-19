import express from 'express';
import { sendMessage, getMessageHistory } from '../controllers/whatsapp.controller.js';
import { handleIncomingMessage } from '../services/twilio.service.js';

const router = express.Router();

// Send WhatsApp message
router.post('/send', sendMessage);

// Get message history for a phone number
router.get('/history/:phoneNumber', getMessageHistory);

// Webhook for incoming messages (Twilio will POST here)
router.post('/webhook', handleIncomingMessage);

export default router;