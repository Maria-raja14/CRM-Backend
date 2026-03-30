// // import FacebookForm from '../models/facebookForm.model.js';

// // // Create a new Facebook lead
// // export const createFacebookLead = async (req, res) => {
// //   try {
// //     // Set source to "Facebook" explicitly
// //     const leadData = { ...req.body, source: 'Facebook' };
// //     const lead = new FacebookForm(leadData);
// //     await lead.save();
// //     res.status(201).json({ success: true, lead });
// //   } catch (error) {
// //     console.error('Create Facebook lead error:', error);
// //     res.status(500).json({ success: false, message: 'Server error' });
// //   }
// // };

// // // Get all Facebook leads
// // export const getAllFacebookLeads = async (req, res) => {
// //   try {
// //     const leads = await FacebookForm.find().sort({ createdAt: -1 });
// //     res.status(200).json({ success: true, leads });
// //   } catch (error) {
// //     console.error('Get all Facebook leads error:', error);
// //     res.status(500).json({ success: false, message: 'Server error' });
// //   }
// // };

// // // Get a single Facebook lead by ID
// // export const getFacebookLeadById = async (req, res) => {
// //   try {
// //     const lead = await FacebookForm.findById(req.params.id);
// //     if (!lead) {
// //       return res.status(404).json({ success: false, message: 'Lead not found' });
// //     }
// //     res.status(200).json({ success: true, lead });
// //   } catch (error) {
// //     console.error('Get Facebook lead error:', error);
// //     res.status(500).json({ success: false, message: 'Server error' });
// //   }
// // };

// // // Update a Facebook lead
// // export const updateFacebookLead = async (req, res) => {
// //   try {
// //     const lead = await FacebookForm.findByIdAndUpdate(
// //       req.params.id,
// //       { ...req.body, source: 'Facebook' }, // ensure source stays "Facebook"
// //       { new: true, runValidators: true }
// //     );
// //     if (!lead) {
// //       return res.status(404).json({ success: false, message: 'Lead not found' });
// //     }
// //     res.status(200).json({ success: true, lead });
// //   } catch (error) {
// //     console.error('Update Facebook lead error:', error);
// //     res.status(500).json({ success: false, message: 'Server error' });
// //   }
// // };

// // // Delete a Facebook lead
// // export const deleteFacebookLead = async (req, res) => {
// //   try {
// //     const lead = await FacebookForm.findByIdAndDelete(req.params.id);
// //     if (!lead) {
// //       return res.status(404).json({ success: false, message: 'Lead not found' });
// //     }
// //     res.status(200).json({ success: true, message: 'Lead deleted' });
// //   } catch (error) {
// //     console.error('Delete Facebook lead error:', error);
// //     res.status(500).json({ success: false, message: 'Server error' });
// //   }
// // };



// import FacebookForm from '../models/facebookForm.model.js';

// // Create a new Facebook lead
// export const createFacebookLead = async (req, res) => {
//   try {
//     // Ensure source is set to "Facebook"
//     const leadData = { ...req.body, source: 'Facebook' };
//     const lead = new FacebookForm(leadData);
//     await lead.save();
//     res.status(201).json({ success: true, lead });
//   } catch (error) {
//     console.error('Create Facebook lead error:', error);
//     res.status(500).json({ success: false, message: 'Server error' });
//   }
// };

// // Get all Facebook leads (admin)
// export const getAllFacebookLeads = async (req, res) => {
//   try {
//     const leads = await FacebookForm.find().sort({ createdAt: -1 });
//     res.status(200).json({ success: true, leads });
//   } catch (error) {
//     console.error('Get all Facebook leads error:', error);
//     res.status(500).json({ success: false, message: 'Server error' });
//   }
// };

// // Get a single Facebook lead by ID
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

// // Update a Facebook lead
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

// // Delete a Facebook lead
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


import FacebookForm from "../models/facebookForm.model.js";

// ✅ VERIFY WEBHOOK (Facebook setup time)
export const verifyWebhook = (req, res) => {
  const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN;

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook Verified ✅");
    return res.status(200).send(challenge);
  } else {
    return res.sendStatus(403);
  }
};

// ✅ RECEIVE FACEBOOK LEADS
export const receiveWebhook = async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const leadData = change?.value;

    if (!leadData) return res.sendStatus(400);

    console.log("📥 Facebook Lead Received:", leadData);

    // 🔹 Extract fields
    let formData = {};

    leadData.field_data.forEach(field => {
      formData[field.name] = field.values[0];
    });

    // 🔹 Map to your DB fields
    const newLead = new FacebookForm({
      leadName: formData.full_name || "",
      phoneNumber: formData.phone_number || "",
      email: formData.email || "",
      destination: formData.destination || "",
      requirement: formData.requirement || "",
      source: "Facebook",
    });

    await newLead.save();

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Webhook Error:", error);
    res.sendStatus(500);
  }
};

// ✅ CREATE FROM REACT FORM
export const createFacebookLead = async (req, res) => {
  try {
    const lead = new FacebookForm({
      ...req.body,
      source: "Facebook",
    });

    await lead.save();

    res.status(201).json({ success: true, lead });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
};

// ✅ GET ALL LEADS
export const getAllFacebookLeads = async (req, res) => {
  try {
    const leads = await FacebookForm.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, leads });
  } catch (error) {
    res.status(500).json({ success: false });
  }
};