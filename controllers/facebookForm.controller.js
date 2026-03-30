import FacebookForm from '../models/facebookForm.model.js';

// Create a new Facebook lead
// export const createFacebookLead = async (req, res) => {
//   try {
//     // Set source to "Facebook" explicitly
//     const leadData = { ...req.body, source: 'Facebook' };
//     const lead = new FacebookForm(leadData);
//     await lead.save();
//     res.status(201).json({ success: true, lead });
//   } catch (error) {
//     console.error('Create Facebook lead error:', error);
//     res.status(500).json({ success: false, message: 'Server error' });
//   }
// };


// Create a new Facebook lead
export const createFacebookLead = async (req, res) => {
  try {
    // 1. Save the original FacebookForm document (for auditing)
    const leadData = { ...req.body, source: 'Facebook' };
    const facebookLead = new FacebookForm(leadData);
    await facebookLead.save();

    // 2. Also create a Lead document so it appears in the main lead table
    const leadDoc = new Lead({
      leadName:        req.body.leadName,
      phoneNumber:     req.body.phoneNumber,
      email:           req.body.email,
      destination:     req.body.destination,
      country:         req.body.country,
      source:          'Facebook',               // mark source
      status:          'Hot',                    // default status, you can change
      noOfTravellers:  req.body.noOfTravellers,
      travelDate:      req.body.travelDate,
      notes:           req.body.notes,
      address:         req.body.address,
      duration:        req.body.duration,
      requirement:     req.body.requirement,
      // assignTo is optional – you can set null or a default user if needed
    });
    await leadDoc.save();

    res.status(201).json({ success: true, lead: leadDoc });
  } catch (error) {
    console.error('Create Facebook lead error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
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

// Get a single Facebook lead by ID
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

// Update a Facebook lead
export const updateFacebookLead = async (req, res) => {
  try {
    const lead = await FacebookForm.findByIdAndUpdate(
      req.params.id,
      { ...req.body, source: 'Facebook' }, // ensure source stays "Facebook"
      { new: true, runValidators: true }
    );
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }
    res.status(200).json({ success: true, lead });
  } catch (error) {
    console.error('Update Facebook lead error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete a Facebook lead
export const deleteFacebookLead = async (req, res) => {
  try {
    const lead = await FacebookForm.findByIdAndDelete(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }
    res.status(200).json({ success: true, message: 'Lead deleted' });
  } catch (error) {
    console.error('Delete Facebook lead error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};



