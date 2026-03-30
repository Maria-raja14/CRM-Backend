

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
//   // ✅ ALWAYS respond first
//   res.status(200).json({ status: "EVENT_RECEIVED" });

//   // 🔥 DEBUG LOGS (ADD HERE)
//   console.log("🔥 WEBHOOK HIT");
//   console.log("📩 BODY:", JSON.stringify(req.body, null, 2));
//   console.log("🔑 TOKEN:", process.env.FB_PAGE_ACCESS_TOKEN);

//   try {
//     const body = req.body;

//     if (body.object !== "page") {
//       console.log("❌ Not a page event");
//       return;
//     }

//     for (const entry of body.entry || []) {
//       for (const change of entry.changes || []) {

//         console.log("➡️ CHANGE RECEIVED:", change);

//         if (change.field !== "leadgen") {
//           console.log("❌ Not leadgen event");
//           continue;
//         }

//         const value = change.value || {};
//         const leadgenId = value.leadgen_id;

//         console.log("✅ LEAD ID:", leadgenId);

//         if (!leadgenId) continue;

//         // 🔥 GRAPH API CALL
//         let fieldData = [];
//         let parsedData = {};

//         try {
//           const graphRes = await axios.get(
//             `https://graph.facebook.com/v19.0/${leadgenId}`,
//             {
//               params: {
//                 access_token: process.env.FB_PAGE_ACCESS_TOKEN,
//                 fields: "field_data",
//               },
//             }
//           );

//           console.log("📦 GRAPH API RESPONSE:", graphRes.data);

//           fieldData = graphRes.data.field_data || [];
//           parsedData = parseFieldData(fieldData);

//           console.log("🧾 PARSED DATA:", parsedData);

//         } catch (err) {
//           console.error("❌ GRAPH API ERROR:", err.response?.data || err.message);
//         }

//         // 🔥 SAVE FACEBOOK LEAD
//         let fbLead;
//         try {
//           fbLead = await FacebookLead.findOneAndUpdate(
//             { leadId: leadgenId },
//             {
//               leadId: leadgenId,
//               fullName: parsedData.fullName,
//               email: parsedData.email,
//               phoneNumber: parsedData.phoneNumber,
//               state: parsedData.state,
//               rawFieldData: fieldData,
//             },
//             { upsert: true, new: true }
//           );

//           console.log("💾 FacebookLead saved:", fbLead._id);

//         } catch (err) {
//           console.error("❌ DB SAVE ERROR:", err.message);
//           continue;
//         }

//         // 🔥 SYNC TO MAIN LEAD
//         try {
//           const existingLead = await Lead.findOne({ facebookLeadId: leadgenId });

//           if (!existingLead) {
//             const newLead = await Lead.create({
//               leadName: parsedData.fullName || "Facebook Lead",
//               email: parsedData.email,
//               phoneNumber: parsedData.phoneNumber,
//               state: parsedData.state,
//               source: "Facebook",
//               status: "Cold",
//               facebookLeadId: leadgenId,
//             });

//             console.log("✅ Lead saved in CRM:", newLead._id);
//           } else {
//             console.log("⚠️ Lead already exists");
//           }

//         } catch (err) {
//           console.error("❌ SYNC ERROR:", err.message);
//         }
//       }
//     }

//   } catch (err) {
//     console.error("❌ WEBHOOK ERROR:", err.message);
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
// };//original code..


// controllers/facebooklead.controller.js
import FacebookLead from "../models/facebooklead.model.js";
import Lead        from "../models/leads.model.js";
import axios       from "axios";

/* ─────────────────────────────────────────────────────────────────────────────
   HELPER – parse Facebook field_data array into a flat object
   field_data looks like:
   [
     { name: "full_name",    values: ["John Doe"] },
     { name: "email",        values: ["john@example.com"] },
     { name: "phone_number", values: ["+91 9000000000"] },
     { name: "state",        values: ["Tamil Nadu"] },
   ]
───────────────────────────────────────────────────────────────────────────── */
const parseFieldData = (fieldData = []) => {
  const map = {};
  fieldData.forEach(({ name, values }) => {
    map[name] = Array.isArray(values) ? values[0] || "" : "";
  });

  return {
    fullName:    map["full_name"]    || map["name"]         || "",
    email:       map["email"]        || map["email_address"] || "",
    phoneNumber: map["phone_number"] || map["phone"]         || "",
    state:       map["state"]        || map["province"]      || map["region"] || "",
  };
};

/* ─────────────────────────────────────────────────────────────────────────────
   GET  /api/facebook-leads/webhook
   Facebook sends a GET request to verify the webhook endpoint.
───────────────────────────────────────────────────────────────────────────── */
export const verifyWebhook = (req, res) => {
  const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || "123456";

  const mode      = req.query["hub.mode"];
  const token     = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  console.log("📘 [FB Webhook] Verification attempt:", { mode, token });

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ [FB Webhook] Verified successfully — challenge sent");
    return res.status(200).send(challenge);
  }

  console.warn("❌ [FB Webhook] Verification FAILED — token mismatch");
  console.warn(`   Expected: "${VERIFY_TOKEN}", Received: "${token}"`);
  return res.status(403).json({ message: "Verification failed" });
};

/* ─────────────────────────────────────────────────────────────────────────────
   POST /api/facebook-leads/webhook
   Facebook sends lead data here when a user submits a Lead Ad form.
───────────────────────────────────────────────────────────────────────────── */
export const receiveWebhook = async (req, res) => {
  // ✅ ALWAYS respond 200 immediately so Facebook doesn't retry
  res.status(200).json({ status: "EVENT_RECEIVED" });

  console.log("\n══════════════════════════════════════════════");
  console.log("🔥 [FB Webhook] POST received");
  console.log("📩 [FB Webhook] Full body:", JSON.stringify(req.body, null, 2));
  console.log("🔑 [FB Webhook] Page Access Token present:", !!process.env.FB_PAGE_ACCESS_TOKEN);
  console.log("══════════════════════════════════════════════\n");

  try {
    const body = req.body;

    if (body.object !== "page") {
      console.log("❌ [FB Webhook] Skipped — not a 'page' object. Got:", body.object);
      return;
    }

    for (const entry of body.entry || []) {
      console.log(`📂 [FB Webhook] Processing entry id: ${entry.id}`);

      for (const change of entry.changes || []) {
        console.log("➡️  [FB Webhook] Change field:", change.field, "| value:", JSON.stringify(change.value));

        if (change.field !== "leadgen") {
          console.log(`⏭️  [FB Webhook] Skipped — field is "${change.field}", expected "leadgen"`);
          continue;
        }

        const value     = change.value || {};
        const leadgenId = value.leadgen_id;
        const pageId    = value.page_id;
        const formId    = value.form_id;
        const adId      = value.ad_id;

        console.log(`✅ [FB Webhook] Lead Gen ID: ${leadgenId} | Page: ${pageId} | Form: ${formId} | Ad: ${adId}`);

        if (!leadgenId) {
          console.warn("⚠️  [FB Webhook] No leadgen_id found — skipping");
          continue;
        }

        // ── Fetch lead details from Facebook Graph API ──────────────────────
        let fieldData  = [];
        let parsedData = {};

        try {
          console.log(`📡 [FB Webhook] Calling Graph API for leadgen_id: ${leadgenId}`);

          const graphRes = await axios.get(
            `https://graph.facebook.com/v19.0/${leadgenId}`,
            {
              params: {
                access_token: process.env.FB_PAGE_ACCESS_TOKEN,
                fields: "field_data,created_time,ad_id,form_id",
              },
            }
          );

          console.log("📦 [FB Webhook] Graph API response:", JSON.stringify(graphRes.data, null, 2));

          fieldData  = graphRes.data.field_data || [];
          parsedData = parseFieldData(fieldData);

          console.log("🧾 [FB Webhook] Parsed lead data:", parsedData);

        } catch (err) {
          console.error("❌ [FB Webhook] Graph API call failed:");
          console.error("   Status:", err.response?.status);
          console.error("   Error:", JSON.stringify(err.response?.data || err.message));
        }

        // ── Save / Update FacebookLead document ────────────────────────────
        let fbLead;
        try {
          fbLead = await FacebookLead.findOneAndUpdate(
            { leadId: leadgenId },
            {
              leadId:      leadgenId,
              pageId:      pageId   || "",
              formId:      formId   || "",
              adId:        adId     || "",
              fullName:    parsedData.fullName,
              email:       parsedData.email,
              phoneNumber: parsedData.phoneNumber,
              state:       parsedData.state,
              rawFieldData: fieldData,
            },
            { upsert: true, new: true }
          );

          console.log(`💾 [FB Webhook] FacebookLead saved/updated: ${fbLead._id} | name: "${fbLead.fullName}" | phone: "${fbLead.phoneNumber}"`);

        } catch (err) {
          console.error("❌ [FB Webhook] DB save error (FacebookLead):", err.message);
          continue;
        }

        // ── Sync to main Lead collection ───────────────────────────────────
        try {
          const existingLead = await Lead.findOne({ facebookLeadId: leadgenId });

          if (!existingLead) {
            const newLead = await Lead.create({
              leadName:       parsedData.fullName || "Facebook Lead",
              email:          parsedData.email,
              phoneNumber:    parsedData.phoneNumber,
              state:          parsedData.state,
              source:         "Facebook",   // ← IMPORTANT: marks this as a Facebook lead
              status:         "Cold",
              facebookLeadId: leadgenId,
            });

            console.log(`✅ [FB Webhook] Lead synced to CRM Leads collection:`);
            console.log(`   _id:    ${newLead._id}`);
            console.log(`   name:   "${newLead.leadName}"`);
            console.log(`   email:  "${newLead.email}"`);
            console.log(`   phone:  "${newLead.phoneNumber}"`);
            console.log(`   source: "${newLead.source}"`);

            // Update fbLead with crmLeadId reference
            await FacebookLead.findByIdAndUpdate(fbLead._id, {
              crmLeadId: newLead._id,
              synced:    true,
            });

            console.log(`🔗 [FB Webhook] FacebookLead ${fbLead._id} linked to CRM Lead ${newLead._id}`);

          } else {
            console.log(`⚠️  [FB Webhook] Lead already exists in CRM — skipping duplicate. CRM Lead: ${existingLead._id}`);
          }

        } catch (err) {
          console.error("❌ [FB Webhook] CRM Lead sync error:", err.message);

          // Save sync error to FacebookLead
          await FacebookLead.findByIdAndUpdate(fbLead._id, {
            synced:    false,
            syncError: err.message,
          }).catch(() => {});
        }
      }
    }

    console.log("✅ [FB Webhook] Processing complete\n");

  } catch (err) {
    console.error("❌ [FB Webhook] Unhandled error:", err.message);
    console.error(err.stack);
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   GET /api/facebook-leads
   Return all Facebook leads (for admin panel / debugging)
───────────────────────────────────────────────────────────────────────────── */
export const getAllFacebookLeads = async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip  = (page - 1) * limit;

    const [leads, total] = await Promise.all([
      FacebookLead.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("crmLeadId", "leadName status source"),
      FacebookLead.countDocuments(),
    ]);

    console.log(`📘 [getAllFacebookLeads] Fetched ${leads.length} of ${total} total`);

    res.json({ leads, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("❌ [getAllFacebookLeads] Error:", err.message);
    res.status(500).json({ message: "Failed to fetch Facebook leads", error: err.message });
  }
};