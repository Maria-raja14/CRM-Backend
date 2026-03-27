

// // controllers/facebooklead.controller.js
// import FacebookLead from "../models/facebooklead.model.js";
// import Lead        from "../models/leads.model.js";   // your existing Lead model
// import axios       from "axios";

// /* ─────────────────────────────────────────────────────────────────────────────
//    HELPER – parse Facebook field_data array into a flat object
//    field_data looks like:
//    [
//      { name: "full_name",    values: ["John Doe"] },
//      { name: "email",        values: ["john@example.com"] },
//      { name: "phone_number", values: ["+91 9000000000"] },
//      { name: "state",        values: ["Tamil Nadu"] },
//    ]
// ───────────────────────────────────────────────────────────────────────────── */
// const parseFieldData = (fieldData = []) => {
//   const map = {};
//   fieldData.forEach(({ name, values }) => {
//     map[name] = Array.isArray(values) ? values[0] || "" : "";
//   });

//   return {
//     fullName:    map["full_name"]    || map["name"]         || "",
//     email:       map["email"]        || map["email_address"] || "",
//     phoneNumber: map["phone_number"] || map["phone"]         || "",
//     state:       map["state"]        || map["province"]      || map["region"] || "",
//   };
// };

// /* ─────────────────────────────────────────────────────────────────────────────
//    GET  /api/facebook-leads/webhook
//    Facebook sends a GET request to verify the webhook endpoint.
//    Must respond with hub.challenge when hub.verify_token matches.
// ───────────────────────────────────────────────────────────────────────────── */
// export const verifyWebhook = (req, res) => {
//   const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || "123456";

//   const mode      = req.query["hub.mode"];
//   const token     = req.query["hub.verify_token"];
//   const challenge = req.query["hub.challenge"];

//   console.log("📘 Facebook webhook verification attempt:", { mode, token });

//   if (mode === "subscribe" && token === VERIFY_TOKEN) {
//     console.log("✅ Facebook webhook verified successfully");
//     return res.status(200).send(challenge);
//   }

//   console.warn("❌ Facebook webhook verification failed – token mismatch");
//   return res.status(403).json({ message: "Verification failed" });
// };

// /* ─────────────────────────────────────────────────────────────────────────────
//    POST /api/facebook-leads/webhook
//    Facebook sends lead data here when a user fills out a Lead Ad form.
// ───────────────────────────────────────────────────────────────────────────── */
// export const receiveWebhook = async (req, res) => {
//   // Always respond 200 first so Facebook doesn't retry aggressively
//   res.status(200).json({ status: "EVENT_RECEIVED" });

//   try {
//     const body = req.body;

//     if (body.object !== "page") {
//       console.log("📘 Facebook webhook – not a page event, ignoring");
//       return;
//     }

//     for (const entry of body.entry || []) {
//       for (const change of entry.changes || []) {
//         if (change.field !== "leadgen") continue;

//         const value      = change.value || {};
//         const leadgenId  = value.leadgen_id;
//         const pageId     = value.page_id  || entry.id;
//         const formId     = value.form_id;
//         const adId       = value.ad_id;
//         const adgroupId  = value.adgroup_id;

//         console.log("📘 New Facebook lead event:", { leadgenId, pageId, formId });

//         if (!leadgenId) continue;

//         // ── Fetch full lead data from Facebook Graph API ──────────────
//         let fieldData  = [];
//         let parsedData = { fullName: "", email: "", phoneNumber: "", state: "" };

//         try {
//           const graphRes = await axios.get(
//             `https://graph.facebook.com/v19.0/${leadgenId}`,
//             {
//               params: {
//                 access_token: process.env.FB_PAGE_ACCESS_TOKEN,
//                 fields: "field_data,created_time,ad_id,adgroup_id,form_id",
//               },
//             }
//           );
//           fieldData  = graphRes.data.field_data || [];
//           parsedData = parseFieldData(fieldData);
//           console.log("📘 Fetched lead field data:", parsedData);
//         } catch (graphErr) {
//           console.error("⚠️  Failed to fetch lead from Graph API:", graphErr.response?.data || graphErr.message);
//         }

//         // ── Save to FacebookLead collection ───────────────────────────
//         let fbLead;
//         try {
//           fbLead = await FacebookLead.findOneAndUpdate(
//             { leadId: leadgenId },
//             {
//               leadId:      leadgenId,
//               pageId,
//               formId,
//               adId,
//               adgroupId,
//               fullName:    parsedData.fullName,
//               email:       parsedData.email,
//               phoneNumber: parsedData.phoneNumber,
//               state:       parsedData.state,
//               rawFieldData: fieldData,
//             },
//             { upsert: true, new: true }
//           );
//         } catch (dbErr) {
//           console.error("❌ Failed to save FacebookLead:", dbErr.message);
//           continue;
//         }

//         // ── Sync to main Lead collection ──────────────────────────────
//         try {
//           const existingLead = await Lead.findOne({ facebookLeadId: leadgenId });

//           if (!existingLead) {
//             const newLead = await Lead.create({
//               leadName:      parsedData.fullName  || "Facebook Lead",
//               email:         parsedData.email,
//               phoneNumber:   parsedData.phoneNumber,
//               state:         parsedData.state,
//               source:        "Facebook",
//               status:        "Cold",
//               facebookLeadId: leadgenId,
//             });

//             await FacebookLead.findByIdAndUpdate(fbLead._id, {
//               crmLeadId: newLead._id,
//               synced:    true,
//             });

//             console.log("✅ Lead synced to CRM:", newLead._id);
//           } else {
//             console.log("📘 Lead already exists in CRM:", existingLead._id);
//           }
//         } catch (syncErr) {
//           console.error("❌ Lead sync failed:", syncErr.message);
//           await FacebookLead.findByIdAndUpdate(fbLead._id, {
//             syncError: syncErr.message,
//           });
//         }
//       }
//     }
//   } catch (err) {
//     console.error("❌ Facebook webhook processing error:", err.message);
//   }
// };

// /* ─────────────────────────────────────────────────────────────────────────────
//    GET /api/facebook-leads
//    Return all Facebook leads (for admin panel / debugging)
// ───────────────────────────────────────────────────────────────────────────── */
// export const getAllFacebookLeads = async (req, res) => {
//   try {
//     const page  = parseInt(req.query.page)  || 1;
//     const limit = parseInt(req.query.limit) || 20;
//     const skip  = (page - 1) * limit;

//     const [leads, total] = await Promise.all([
//       FacebookLead.find().sort({ createdAt: -1 }).skip(skip).limit(limit).populate("crmLeadId", "leadName status"),
//       FacebookLead.countDocuments(),
//     ]);

//     res.json({ leads, total, page, totalPages: Math.ceil(total / limit) });
//   } catch (err) {
//     res.status(500).json({ message: "Failed to fetch Facebook leads", error: err.message });
//   }
// };