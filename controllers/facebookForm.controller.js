// import FacebookForm from '../models/facebookForm.model.js';
// import Lead from '../models/leads.model.js'; // ← adjust path to your Lead model

// // Create a new Facebook lead
// export const createFacebookLead = async (req, res) => {
//   try {
//     // 1. Save the original FacebookForm document (audit trail)
//     const leadData = { ...req.body, source: 'Facebook' };
//     const facebookLead = new FacebookForm(leadData);
//     await facebookLead.save();

//     // 2. Also create a Lead document for the main leads table
//     const leadDoc = new Lead({
//       leadName:        req.body.leadName,
//       phoneNumber:     req.body.phoneNumber,
//       email:           req.body.email,
//       destination:     req.body.destination,
//       country:         req.body.country,
//       source:          'Facebook',                // marks source clearly
//       status:          'Hot',                     // default status (you can change)
//       noOfTravellers:  req.body.noOfTravellers,
//       travelDate:      req.body.travelDate,
//       notes:           req.body.notes,
//       address:         req.body.address,
//       duration:        req.body.duration,
//       requirement:     req.body.requirement,
//       // assignTo: null, // optional – you can set a default user if needed
//     });
//     await leadDoc.save();

//     res.status(201).json({ success: true, lead: leadDoc });
//   } catch (error) {
//     console.error('Create Facebook lead error:', error);
//     res.status(500).json({ success: false, message: 'Server error' });
//   }
// };

// // Other controller functions remain unchanged
// export const getAllFacebookLeads = async (req, res) => {
//   try {
//     const leads = await FacebookForm.find().sort({ createdAt: -1 });
//     res.status(200).json({ success: true, leads });
//   } catch (error) {
//     console.error('Get all Facebook leads error:', error);
//     res.status(500).json({ success: false, message: 'Server error' });
//   }
// };

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
//     res.status(200).json({ success: true, lead });
//   } catch (error) {
//     console.error('Update Facebook lead error:', error);
//     res.status(500).json({ success: false, message: 'Server error' });
//   }
// };

// export const deleteFacebookLead = async (req, res) => {
//   try {
//     const lead = await FacebookForm.findByIdAndDelete(req.params.id);
//     if (!lead) {
//       return res.status(404).json({ success: false, message: 'Lead not found' });
//     }
//     res.status(200).json({ success: true, message: 'Lead deleted' });
//   } catch (error) {
//     console.error('Delete Facebook lead error:', error);
//     res.status(500).json({ success: false, message: 'Server error' });
//   }
// };


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

//     // 2. Also create a Lead document for the main leads table
//     // Only include fields that exist in the request, don't require anything
//     const leadDocData = {
//       leadName: req.body.leadName || '',
//       phoneNumber: req.body.phoneNumber || '',
//       email: req.body.email || '',
//       destination: req.body.destination || '',
//       country: req.body.country || '',
//       source: 'Facebook',
//       status: 'Hot',
//       noOfTravellers: req.body.noOfTravellers || null,
//       travelDate: req.body.travelDate || null,
//       notes: req.body.notes || '',
//       address: req.body.address || '',
//       duration: req.body.duration || '',
//       requirement: req.body.requirement || '',
//     };
    
//     const leadDoc = new Lead(leadDocData);
//     await leadDoc.save();
//     console.log('Lead saved:', leadDoc._id);

//     res.status(201).json({ success: true, lead: leadDoc, facebookLead: facebookLead });
//   } catch (error) {
//     console.error('Create Facebook lead error:', error);
//     // Send more detailed error for debugging
//     res.status(500).json({ 
//       success: false, 
//       message: 'Server error',
//       error: error.message,
//       details: error.errors ? Object.keys(error.errors).map(k => ({ field: k, message: error.errors[k].message })) : null
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
//     res.status(200).json({ success: true, lead });
//   } catch (error) {
//     console.error('Update Facebook lead error:', error);
//     res.status(500).json({ success: false, message: 'Server error' });
//   }
// };

// // Delete Facebook lead
// export const deleteFacebookLead = async (req, res) => {
//   try {
//     const lead = await FacebookForm.findByIdAndDelete(req.params.id);
//     if (!lead) {
//       return res.status(404).json({ success: false, message: 'Lead not found' });
//     }
//     res.status(200).json({ success: true, message: 'Lead deleted' });
//   } catch (error) {
//     console.error('Delete Facebook lead error:', error);
//     res.status(500).json({ success: false, message: 'Server error' });
//   }
// };


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

//     // 2. Create a Lead document for the main leads table
//     // IMPORTANT: Lead model requires leadName, phoneNumber, destination
//     // If these are missing, use fallback values
//     const leadDocData = {
//       // Required fields with fallbacks
//       leadName: req.body.leadName && req.body.leadName.trim() !== '' 
//         ? req.body.leadName 
//         : `Facebook Lead ${new Date().toLocaleDateString()}`,
      
//       phoneNumber: req.body.phoneNumber && req.body.phoneNumber.trim() !== '' 
//         ? req.body.phoneNumber 
//         : '0000000000', // Fallback phone number (won't be used for actual contact)
      
//       destination: req.body.destination && req.body.destination.trim() !== '' 
//         ? req.body.destination 
//         : 'Not Specified',
      
//       // Optional fields
//       email: req.body.email || '',
//       country: req.body.country || '',
//       source: 'Facebook',
//       status: 'Hot',
//       noOfTravellers: req.body.noOfTravellers || null,
//       travelDate: req.body.travelDate || null,
//       notes: req.body.notes || '',
//       address: req.body.address || '',
//       duration: req.body.duration || '',
//       requirement: req.body.requirement || '',
      
//       // Link to FacebookForm
//       facebookLeadId: facebookLead._id,
//     };
    
//     const leadDoc = new Lead(leadDocData);
//     await leadDoc.save();
//     console.log('Lead saved:', leadDoc._id);

//     res.status(201).json({ 
//       success: true, 
//       lead: leadDoc, 
//       facebookLead: facebookLead 
//     });
    
//   } catch (error) {
//     console.error('Create Facebook lead error:', error);
    
//     // Handle duplicate key error specifically
//     if (error.code === 11000) {
//       return res.status(409).json({ 
//         success: false, 
//         message: 'This Facebook lead has already been imported',
//         error: 'Duplicate entry'
//       });
//     }
    
//     res.status(500).json({ 
//       success: false, 
//       message: 'Server error',
//       error: error.message,
//       details: error.errors ? Object.keys(error.errors).map(k => ({ 
//         field: k, 
//         message: error.errors[k].message 
//       })) : null
//     });
//   }
// };//old one..

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
//     if (lead._id) {
//       await Lead.findOneAndUpdate(
//         { facebookLeadId: lead._id },
//         { 
//           leadName: req.body.leadName,
//           phoneNumber: req.body.phoneNumber,
//           email: req.body.email,
//           destination: req.body.destination,
//           country: req.body.country,
//           duration: req.body.duration,
//           requirement: req.body.requirement,
//           address: req.body.address,
//           noOfTravellers: req.body.noOfTravellers,
//           travelDate: req.body.travelDate,
//           notes: req.body.notes,
//         },
//         { new: true }
//       );
//     }
    
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
// };///all work correctly..


import FacebookForm from '../models/facebookForm.model.js';
import Lead from '../models/leads.model.js';

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
      // Lead model requires these three fields — use smart fallbacks only
      leadName: req.body.leadName && req.body.leadName.trim() !== ''
        ? req.body.leadName
        : `Facebook Lead ${new Date().toLocaleDateString()}`,

      // Only use actual number if provided, else a placeholder that signals "not given"
      phoneNumber: hasPhone
        ? req.body.phoneNumber
        : 'Not Provided',

      destination: req.body.destination && req.body.destination.trim() !== ''
        ? req.body.destination
        : 'Not Specified',

      // Optional fields — only add if they have real values
      ...(req.body.email    && { email: req.body.email }),
      ...(req.body.country  && { country: req.body.country }),
      ...(req.body.address  && { address: req.body.address }),
      ...(req.body.duration && { duration: req.body.duration }),
      ...(req.body.requirement && { requirement: req.body.requirement }),
      ...(req.body.notes    && { notes: req.body.notes }),
      ...(req.body.noOfTravellers && { noOfTravellers: req.body.noOfTravellers }),
      ...(req.body.travelDate && { travelDate: req.body.travelDate }),

      source: 'Facebook',
      status: 'Hot',
      facebookLeadId: facebookLead._id,
    };

    const leadDoc = new Lead(leadDocData);
    await leadDoc.save();
    console.log('Lead saved:', leadDoc._id);

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

    // Also update the linked Lead document if it exists
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

    // Also delete the linked Lead document
    await Lead.findOneAndDelete({ facebookLeadId: lead._id });

    // Delete the FacebookForm document
    await FacebookForm.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, message: 'Lead deleted' });
  } catch (error) {
    console.error('Delete Facebook lead error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};