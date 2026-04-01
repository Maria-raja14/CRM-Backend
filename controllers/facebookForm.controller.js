// import FacebookForm from '../models/facebookForm.model.js';
// import Lead from '../models/leads.model.js';

// // Create a new Facebook lead
// export const createFacebookLead = async (req, res) => {
//   try {
//     console.log('Received Facebook lead data:', req.body);

//     // 1. Save the original FacebookForm document (audit trail)
//     const leadData = { ...req.body, source: 'Facebook' };
//     const facebookLead = new FacebookForm(leadData);
//     await facebookLead.save();
//     console.log('FacebookForm saved:', facebookLead._id);

//     // 2. Build Lead document — only include phoneNumber if user actually provided it
//     const hasPhone = req.body.phoneNumber && req.body.phoneNumber.trim() !== '' && req.body.phoneNumber.replace(/\D/g, '').length > 3;

//     const leadDocData = {
//       // Lead model requires these three fields — use smart fallbacks only
//       leadName: req.body.leadName && req.body.leadName.trim() !== ''
//         ? req.body.leadName
//         : `Facebook Lead ${new Date().toLocaleDateString()}`,

//       // Only use actual number if provided, else a placeholder that signals "not given"
//       phoneNumber: hasPhone
//         ? req.body.phoneNumber
//         : 'Not Provided',

//       destination: req.body.destination && req.body.destination.trim() !== ''
//         ? req.body.destination
//         : 'Not Specified',

//       // Optional fields — only add if they have real values
//       ...(req.body.email    && { email: req.body.email }),
//       ...(req.body.country  && { country: req.body.country }),
//       ...(req.body.address  && { address: req.body.address }),
//       ...(req.body.duration && { duration: req.body.duration }),
//       ...(req.body.requirement && { requirement: req.body.requirement }),
//       ...(req.body.notes    && { notes: req.body.notes }),
//       ...(req.body.noOfTravellers && { noOfTravellers: req.body.noOfTravellers }),
//       ...(req.body.travelDate && { travelDate: req.body.travelDate }),

//       source: 'Facebook',
//       status: 'Hot',
//       facebookLeadId: facebookLead._id,
//     };

//     const leadDoc = new Lead(leadDocData);
//     await leadDoc.save();
//     console.log('Lead saved:', leadDoc._id);

//     res.status(201).json({
//       success: true,
//       lead: leadDoc,
//       facebookLead: facebookLead,
//     });

//   } catch (error) {
//     console.error('Create Facebook lead error:', error);

//     if (error.code === 11000) {
//       return res.status(409).json({
//         success: false,
//         message: 'This Facebook lead has already been imported',
//         error: 'Duplicate entry',
//       });
//     }

//     res.status(500).json({
//       success: false,
//       message: 'Server error',
//       error: error.message,
//       details: error.errors
//         ? Object.keys(error.errors).map(k => ({
//             field: k,
//             message: error.errors[k].message,
//           }))
//         : null,
//     });
//   }
// };

// // Get all Facebook leads
// export const getAllFacebookLeads = async (req, res) => {
//   try {
//     const leads = await FacebookForm.find().sort({ createdAt: -1 });
//     res.status(200).json({ success: true, leads });
//   } catch (error) {
//     console.error('Get all Facebook leads error:', error);
//     res.status(500).json({ success: false, message: 'Server error' });
//   }
// };

// // Get Facebook lead by ID
// export const getFacebookLeadById = async (req, res) => {
//   try {
//     const lead = await FacebookForm.findById(req.params.id);
//     if (!lead) {
//       return res.status(404).json({ success: false, message: 'Lead not found' });
//     }
//     res.status(200).json({ success: true, lead });
//   } catch (error) {
//     console.error('Get Facebook lead error:', error);
//     res.status(500).json({ success: false, message: 'Server error' });
//   }
// };

// // Update Facebook lead
// export const updateFacebookLead = async (req, res) => {
//   try {
//     const lead = await FacebookForm.findByIdAndUpdate(
//       req.params.id,
//       { ...req.body, source: 'Facebook' },
//       { new: true, runValidators: true }
//     );
//     if (!lead) {
//       return res.status(404).json({ success: false, message: 'Lead not found' });
//     }

//     // Also update the linked Lead document if it exists
//     const hasPhone = req.body.phoneNumber &&
//       req.body.phoneNumber.trim() !== '' &&
//       req.body.phoneNumber.replace(/\D/g, '').length > 3;

//     const updatePayload = {
//       ...(req.body.leadName    && { leadName: req.body.leadName }),
//       phoneNumber: hasPhone ? req.body.phoneNumber : 'Not Provided',
//       ...(req.body.email       && { email: req.body.email }),
//       ...(req.body.destination && { destination: req.body.destination }),
//       ...(req.body.country     && { country: req.body.country }),
//       ...(req.body.duration    && { duration: req.body.duration }),
//       ...(req.body.requirement && { requirement: req.body.requirement }),
//       ...(req.body.address     && { address: req.body.address }),
//       ...(req.body.noOfTravellers && { noOfTravellers: req.body.noOfTravellers }),
//       ...(req.body.travelDate  && { travelDate: req.body.travelDate }),
//       ...(req.body.notes       && { notes: req.body.notes }),
//     };

//     await Lead.findOneAndUpdate(
//       { facebookLeadId: lead._id },
//       updatePayload,
//       { new: true }
//     );

//     res.status(200).json({ success: true, lead });
//   } catch (error) {
//     console.error('Update Facebook lead error:', error);
//     res.status(500).json({ success: false, message: 'Server error' });
//   }
// };

// // Delete Facebook lead
// export const deleteFacebookLead = async (req, res) => {
//   try {
//     const lead = await FacebookForm.findById(req.params.id);
//     if (!lead) {
//       return res.status(404).json({ success: false, message: 'Lead not found' });
//     }

//     // Also delete the linked Lead document
//     await Lead.findOneAndDelete({ facebookLeadId: lead._id });

//     // Delete the FacebookForm document
//     await FacebookForm.findByIdAndDelete(req.params.id);

//     res.status(200).json({ success: true, message: 'Lead deleted' });
//   } catch (error) {
//     console.error('Delete Facebook lead error:', error);
//     res.status(500).json({ success: false, message: 'Server error' });
//   }
// };//all work correctly...




import FacebookForm from '../models/facebookForm.model.js';
import Lead from '../models/leads.model.js';
import { getIO } from '../realtime/socket.js'; // ✅ ADDED

// Create a new Facebook lead
export const createFacebookLead = async (req, res) => {
  try {
    console.log('Received Facebook lead data:', req.body);

    // 1. Save the original FacebookForm document (audit trail)
    const leadData = { ...req.body, source: 'Facebook' };
    const facebookLead = new FacebookForm(leadData);
    await facebookLead.save();
    console.log('FacebookForm saved:', facebookLead._id);

    // 2. Build Lead document — only include phoneNumber if user actually provided it
    const hasPhone = req.body.phoneNumber && req.body.phoneNumber.trim() !== '' && req.body.phoneNumber.replace(/\D/g, '').length > 3;

    const leadDocData = {
      leadName: req.body.leadName && req.body.leadName.trim() !== ''
        ? req.body.leadName
        : `Facebook Lead ${new Date().toLocaleDateString()}`,

      phoneNumber: hasPhone
        ? req.body.phoneNumber
        : 'Not Provided',

      destination: req.body.destination && req.body.destination.trim() !== ''
        ? req.body.destination
        : 'Not Specified',

      ...(req.body.email       && { email: req.body.email }),
      ...(req.body.country     && { country: req.body.country }),
      ...(req.body.address     && { address: req.body.address }),
      ...(req.body.duration    && { duration: req.body.duration }),
      ...(req.body.requirement && { requirement: req.body.requirement }),
      ...(req.body.notes       && { notes: req.body.notes }),
      ...(req.body.noOfTravellers && { noOfTravellers: req.body.noOfTravellers }),
      ...(req.body.travelDate  && { travelDate: req.body.travelDate }),

      source: 'Facebook',
      status: 'Hot',
      facebookLeadId: facebookLead._id,
    };

    const leadDoc = new Lead(leadDocData);
    await leadDoc.save();
    console.log('Lead saved:', leadDoc._id);

    // ✅ ADDED — broadcast the new lead to all connected dashboard users instantly
    const io = getIO();
    if (io) {
      io.emit('new_facebook_lead', leadDoc.toObject());
      console.log('📡 Emitted new_facebook_lead to all connected clients');
    }

    res.status(201).json({
      success: true,
      lead: leadDoc,
      facebookLead: facebookLead,
    });

  } catch (error) {
    console.error('Create Facebook lead error:', error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'This Facebook lead has already been imported',
        error: 'Duplicate entry',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
      details: error.errors
        ? Object.keys(error.errors).map(k => ({
            field: k,
            message: error.errors[k].message,
          }))
        : null,
    });
  }
};

// Get all Facebook leads
export const getAllFacebookLeads = async (req, res) => {
  try {
    const leads = await FacebookForm.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, leads });
  } catch (error) {
    console.error('Get all Facebook leads error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get Facebook lead by ID
export const getFacebookLeadById = async (req, res) => {
  try {
    const lead = await FacebookForm.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }
    res.status(200).json({ success: true, lead });
  } catch (error) {
    console.error('Get Facebook lead error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update Facebook lead
export const updateFacebookLead = async (req, res) => {
  try {
    const lead = await FacebookForm.findByIdAndUpdate(
      req.params.id,
      { ...req.body, source: 'Facebook' },
      { new: true, runValidators: true }
    );
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    const hasPhone = req.body.phoneNumber &&
      req.body.phoneNumber.trim() !== '' &&
      req.body.phoneNumber.replace(/\D/g, '').length > 3;

    const updatePayload = {
      ...(req.body.leadName    && { leadName: req.body.leadName }),
      phoneNumber: hasPhone ? req.body.phoneNumber : 'Not Provided',
      ...(req.body.email       && { email: req.body.email }),
      ...(req.body.destination && { destination: req.body.destination }),
      ...(req.body.country     && { country: req.body.country }),
      ...(req.body.duration    && { duration: req.body.duration }),
      ...(req.body.requirement && { requirement: req.body.requirement }),
      ...(req.body.address     && { address: req.body.address }),
      ...(req.body.noOfTravellers && { noOfTravellers: req.body.noOfTravellers }),
      ...(req.body.travelDate  && { travelDate: req.body.travelDate }),
      ...(req.body.notes       && { notes: req.body.notes }),
    };

    await Lead.findOneAndUpdate(
      { facebookLeadId: lead._id },
      updatePayload,
      { new: true }
    );

    res.status(200).json({ success: true, lead });
  } catch (error) {
    console.error('Update Facebook lead error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete Facebook lead
export const deleteFacebookLead = async (req, res) => {
  try {
    const lead = await FacebookForm.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    await Lead.findOneAndDelete({ facebookLeadId: lead._id });
    await FacebookForm.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, message: 'Lead deleted' });
  } catch (error) {
    console.error('Delete Facebook lead error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};































// import FacebookForm from '../models/facebookForm.model.js';
// import Lead from '../models/leads.model.js';
// import { notifyAdmins } from '../realtime/socket.js'; // ← import notifyAdmins

// // Create a new Facebook lead
// export const createFacebookLead = async (req, res) => {
//   try {
//     console.log('Received Facebook lead data:', req.body);

//     // 1. Save the original FacebookForm document (audit trail)
//     const leadData = { ...req.body, source: 'Facebook' };
//     const facebookLead = new FacebookForm(leadData);
//     await facebookLead.save();
//     console.log('FacebookForm saved:', facebookLead._id);

//     // 2. Build Lead document — only include phoneNumber if user actually provided it
//     const hasPhone = req.body.phoneNumber && req.body.phoneNumber.trim() !== '' && req.body.phoneNumber.replace(/\D/g, '').length > 3;

//     const leadDocData = {
//       leadName: req.body.leadName && req.body.leadName.trim() !== ''
//         ? req.body.leadName
//         : `Facebook Lead ${new Date().toLocaleDateString()}`,

//       phoneNumber: hasPhone
//         ? req.body.phoneNumber
//         : 'Not Provided',

//       destination: req.body.destination && req.body.destination.trim() !== ''
//         ? req.body.destination
//         : 'Not Specified',

//       ...(req.body.email       && { email: req.body.email }),
//       ...(req.body.country     && { country: req.body.country }),
//       ...(req.body.address     && { address: req.body.address }),
//       ...(req.body.duration    && { duration: req.body.duration }),
//       ...(req.body.requirement && { requirement: req.body.requirement }),
//       ...(req.body.notes       && { notes: req.body.notes }),
//       ...(req.body.noOfTravellers && { noOfTravellers: req.body.noOfTravellers }),
//       ...(req.body.travelDate  && { travelDate: req.body.travelDate }),

//       source: 'Facebook',
//       status: 'Hot',
//       facebookLeadId: facebookLead._id,
//     };

//     const leadDoc = new Lead(leadDocData);
//     await leadDoc.save();
//     console.log('Lead saved:', leadDoc._id);

//     // ─────────────────────────────────────────────────────────────────────
//     // 3. Emit real-time event so LeadTable updates without a page refresh
//     //    We need all admin/sales user IDs to push the event to them.
//     //    Import your User model and query for admin+sales roles, OR keep a
//     //    cached list. Here we use a simple approach: fetch all admin users.
//     // ─────────────────────────────────────────────────────────────────────
//     try {
//       // Import User model inline to avoid circular deps at top-level
//       const { default: User } = await import('../models/user.model.js');

//       const adminUsers = await User.find(
//         { 'role.name': { $in: ['Admin', 'Sales'] } },
//         '_id'
//       ).lean();

//       const adminIds = adminUsers.map((u) => String(u._id));

//       // Build the payload that matches what LeadTable expects
//       const socketPayload = {
//         ...leadDoc.toObject(),
//         source: 'Facebook',
//       };

//       notifyAdmins(adminIds, 'new_facebook_lead', socketPayload);
//       console.log(`📡 Emitted new_facebook_lead to ${adminIds.length} admin(s)`);
//     } catch (socketErr) {
//       // Non-fatal — lead is already saved, just log the socket error
//       console.error('Socket emit error (non-fatal):', socketErr.message);
//     }

//     res.status(201).json({
//       success: true,
//       lead: leadDoc,
//       facebookLead: facebookLead,
//     });

//   } catch (error) {
//     console.error('Create Facebook lead error:', error);

//     if (error.code === 11000) {
//       return res.status(409).json({
//         success: false,
//         message: 'This Facebook lead has already been imported',
//         error: 'Duplicate entry',
//       });
//     }

//     res.status(500).json({
//       success: false,
//       message: 'Server error',
//       error: error.message,
//       details: error.errors
//         ? Object.keys(error.errors).map(k => ({
//             field: k,
//             message: error.errors[k].message,
//           }))
//         : null,
//     });
//   }
// };

// // Get all Facebook leads
// export const getAllFacebookLeads = async (req, res) => {
//   try {
//     const leads = await FacebookForm.find().sort({ createdAt: -1 });
//     res.status(200).json({ success: true, leads });
//   } catch (error) {
//     console.error('Get all Facebook leads error:', error);
//     res.status(500).json({ success: false, message: 'Server error' });
//   }
// };

// // Get Facebook lead by ID
// export const getFacebookLeadById = async (req, res) => {
//   try {
//     const lead = await FacebookForm.findById(req.params.id);
//     if (!lead) {
//       return res.status(404).json({ success: false, message: 'Lead not found' });
//     }
//     res.status(200).json({ success: true, lead });
//   } catch (error) {
//     console.error('Get Facebook lead error:', error);
//     res.status(500).json({ success: false, message: 'Server error' });
//   }
// };

// // Update Facebook lead
// export const updateFacebookLead = async (req, res) => {
//   try {
//     const lead = await FacebookForm.findByIdAndUpdate(
//       req.params.id,
//       { ...req.body, source: 'Facebook' },
//       { new: true, runValidators: true }
//     );
//     if (!lead) {
//       return res.status(404).json({ success: false, message: 'Lead not found' });
//     }

//     const hasPhone = req.body.phoneNumber &&
//       req.body.phoneNumber.trim() !== '' &&
//       req.body.phoneNumber.replace(/\D/g, '').length > 3;

//     const updatePayload = {
//       ...(req.body.leadName    && { leadName: req.body.leadName }),
//       phoneNumber: hasPhone ? req.body.phoneNumber : 'Not Provided',
//       ...(req.body.email       && { email: req.body.email }),
//       ...(req.body.destination && { destination: req.body.destination }),
//       ...(req.body.country     && { country: req.body.country }),
//       ...(req.body.duration    && { duration: req.body.duration }),
//       ...(req.body.requirement && { requirement: req.body.requirement }),
//       ...(req.body.address     && { address: req.body.address }),
//       ...(req.body.noOfTravellers && { noOfTravellers: req.body.noOfTravellers }),
//       ...(req.body.travelDate  && { travelDate: req.body.travelDate }),
//       ...(req.body.notes       && { notes: req.body.notes }),
//     };

//     await Lead.findOneAndUpdate(
//       { facebookLeadId: lead._id },
//       updatePayload,
//       { new: true }
//     );

//     res.status(200).json({ success: true, lead });
//   } catch (error) {
//     console.error('Update Facebook lead error:', error);
//     res.status(500).json({ success: false, message: 'Server error' });
//   }
// };

// // Delete Facebook lead
// export const deleteFacebookLead = async (req, res) => {
//   try {
//     const lead = await FacebookForm.findById(req.params.id);
//     if (!lead) {
//       return res.status(404).json({ success: false, message: 'Lead not found' });
//     }

//     await Lead.findOneAndDelete({ facebookLeadId: lead._id });
//     await FacebookForm.findByIdAndDelete(req.params.id);

//     res.status(200).json({ success: true, message: 'Lead deleted' });
//   } catch (error) {
//     console.error('Delete Facebook lead error:', error);
//     res.status(500).json({ success: false, message: 'Server error' });
//   }
// };