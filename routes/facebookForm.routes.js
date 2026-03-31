


// routes/facebookForm.routes.js

import express from 'express';
import {
  createFacebookLead,
  getAllFacebookLeads,
  getFacebookLeadById,
  updateFacebookLead,
  deleteFacebookLead,
} from '../controllers/facebookForm.controller.js';

const router = express.Router();

// ─── Public route (no auth) ────────────────────────────────────────────────────
// POST /api/facebook-form/create
router.post('/create', createFacebookLead);

// ─── Protected routes (add your auth middleware here if needed) ────────────────
// GET    /api/facebook-form/
router.get('/', getAllFacebookLeads);

// GET    /api/facebook-form/:id
router.get('/:id', getFacebookLeadById);

// PUT    /api/facebook-form/:id
router.put('/:id', updateFacebookLead);

// DELETE /api/facebook-form/:id
router.delete('/:id', deleteFacebookLead);

export default router;