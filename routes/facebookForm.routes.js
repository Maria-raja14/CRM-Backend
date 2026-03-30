import express from 'express';
import {
  createFacebookLead,
  getAllFacebookLeads,
  getFacebookLeadById,
  updateFacebookLead,
  deleteFacebookLead,
} from '../controllers/facebookForm.controller.js';
import { protect } from '../middlewares/auth.middleware.js'; // if you have auth middleware

const router = express.Router();

// All routes are protected (adjust as needed)
router.post('/create', protect, createFacebookLead);
router.get('/', protect, getAllFacebookLeads);
router.get('/:id', protect, getFacebookLeadById);
router.put('/:id', protect, updateFacebookLead);
router.delete('/:id', protect, deleteFacebookLead);

export default router;