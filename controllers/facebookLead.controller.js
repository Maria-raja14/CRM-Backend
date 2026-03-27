// // controllers/facebooklead.controller.js
// import axios from "axios";
// import FacebookLead from "../models/facebooklead.model.js";

// // ─── Helper: map raw Facebook field_data array → plain object ────────────────
// const parseFields = (fieldData = []) => {
//   const map = {};
//   for (const f of fieldData) {
//     map[f.name] = f.values?.[0] ?? "";
//   }
//   return map;
// };

// // ─── Helper: fetch full lead from Graph API ───────────────────────────────────
// const fetchFromGraph = async (leadgenId) => {
//   try {
//     const { data } = await axios.get(
//       `https://graph.facebook.com/v19.0/${leadgenId}`,
//       { params: { access_token: process.env.FACEBOOK_PAGE_ACCESS_TOKEN } }
//     );
//     return data;
//   } catch (err) {
//     console.error(`❌ Graph API error for ${leadgenId}:`, err.response?.data || err.message);
//     return null;
//   }
// };

// // ═══════════════════════════════════════════════════════════════════════════════
// // GET  /api/webhook  — Facebook verification handshake
// // ═══════════════════════════════════════════════════════════════════════════════
// export const verifyWebhook = (req, res) => {
//   const mode      = req.query["hub.mode"];
//   const token     = req.query["hub.verify_token"];
//   const challenge = req.query["hub.challenge"];

//   console.log("📘 Facebook verify attempt →", { mode, token });

//   if (mode === "subscribe" && token === process.env.FACEBOOK_VERIFY_TOKEN) {
//     console.log("✅ Facebook webhook verified");
//     return res.status(200).send(challenge); // plain-text — NOT JSON
//   }

//   console.warn("❌ Verification failed — token mismatch");
//   return res.status(403).json({ message: "Forbidden: token mismatch" });
// };

// // ═══════════════════════════════════════════════════════════════════════════════
// // POST /api/webhook  — Facebook sends lead events here
// // ═══════════════════════════════════════════════════════════════════════════════
// export const receiveLeadWebhook = async (req, res) => {
//   // Always respond 200 immediately so Facebook does NOT retry
//   res.status(200).json({ status: "EVENT_RECEIVED" });

//   try {
//     const body = req.body;
//     console.log("📩 FB webhook POST:", JSON.stringify(body, null, 2));

//     if (body.object !== "page") return;

//     for (const entry of body.entry || []) {
//       for (const change of entry.changes || []) {
//         if (change.field !== "leadgen") continue;

//         const { leadgen_id, page_id, form_id, ad_id } = change.value || {};
//         if (!leadgen_id) continue;

//         // Avoid duplicate saves
//         const exists = await FacebookLead.findOne({ leadgenId: leadgen_id });
//         if (exists) {
//           console.log(`⚠️  Lead ${leadgen_id} already exists — skipping`);
//           continue;
//         }

//         // Fetch full data from Graph API
//         const leadData = await fetchFromGraph(leadgen_id);
//         if (!leadData) continue;

//         const fields = parseFields(leadData.field_data);
//         console.log("📊 Fields from Facebook:", fields);

//         // Build name — Facebook may send full_name OR first_name + last_name
//         const fullName =
//           fields["full_name"] ||
//           `${fields["first_name"] || ""} ${fields["last_name"] || ""}`.trim() ||
//           "Unknown";

//         const lead = await FacebookLead.create({
//           leadgenId:   leadgen_id,
//           formId:      form_id   || "",
//           adId:        ad_id     || "",
//           pageId:      page_id   || "",
//           leadName:    fullName,
//           email:       fields["email"]        || fields["email_address"] || "",
//           phoneNumber: fields["phone_number"] || fields["phone"]         || "",
//           state:       fields["state"]        || fields["province"]      || "",
//           source:      "Facebook Lead Ad",
//           status:      "Cold",
//           rawFields:   fields,
//         });

//         console.log(`✅ Facebook lead saved → _id: ${lead._id}  name: ${fullName}`);
//       }
//     }
//   } catch (err) {
//     console.error("🚨 receiveLeadWebhook error:", err.message);
//   }
// };

// // ═══════════════════════════════════════════════════════════════════════════════
// // GET /api/facebook-leads  — paginated list
// // ═══════════════════════════════════════════════════════════════════════════════
// export const getAllFacebookLeads = async (req, res) => {
//   try {
//     const page   = parseInt(req.query.page)  || 1;
//     const limit  = parseInt(req.query.limit) || 10;
//     const skip   = (page - 1) * limit;
//     const search = req.query.search || "";
//     const status = req.query.status || "";

//     const filter = {};
//     if (status) filter.status = status;
//     if (search) {
//       filter.$or = [
//         { leadName:    { $regex: search, $options: "i" } },
//         { email:       { $regex: search, $options: "i" } },
//         { phoneNumber: { $regex: search, $options: "i" } },
//         { state:       { $regex: search, $options: "i" } },
//       ];
//     }

//     const [leads, totalLeads] = await Promise.all([
//       FacebookLead.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
//       FacebookLead.countDocuments(filter),
//     ]);

//     return res.status(200).json({
//       success: true,
//       leads,
//       totalLeads,
//       totalPages: Math.ceil(totalLeads / limit),
//       currentPage: page,
//     });
//   } catch (err) {
//     console.error("🚨 getAllFacebookLeads:", err.message);
//     return res.status(500).json({ message: "Server error", error: err.message });
//   }
// };

// // ═══════════════════════════════════════════════════════════════════════════════
// // PATCH /api/facebook-leads/:id/status
// // ═══════════════════════════════════════════════════════════════════════════════
// export const updateFacebookLeadStatus = async (req, res) => {
//   try {
//     const lead = await FacebookLead.findByIdAndUpdate(
//       req.params.id,
//       { status: req.body.status },
//       { new: true }
//     );
//     if (!lead) return res.status(404).json({ message: "Lead not found" });
//     return res.status(200).json({ success: true, lead });
//   } catch (err) {
//     return res.status(500).json({ message: "Server error", error: err.message });
//   }
// };

// // ═══════════════════════════════════════════════════════════════════════════════
// // PATCH /api/facebook-leads/:id/followup
// // ═══════════════════════════════════════════════════════════════════════════════
// export const updateFacebookLeadFollowUp = async (req, res) => {
//   try {
//     const lead = await FacebookLead.findByIdAndUpdate(
//       req.params.id,
//       { followUpDate: req.body.followUpDate },
//       { new: true }
//     );
//     if (!lead) return res.status(404).json({ message: "Lead not found" });
//     return res.status(200).json({ success: true, lead });
//   } catch (err) {
//     return res.status(500).json({ message: "Server error", error: err.message });
//   }
// };

// // ═══════════════════════════════════════════════════════════════════════════════
// // DELETE /api/facebook-leads/:id
// // ═══════════════════════════════════════════════════════════════════════════════
// export const deleteFacebookLead = async (req, res) => {
//   try {
//     const lead = await FacebookLead.findByIdAndDelete(req.params.id);
//     if (!lead) return res.status(404).json({ message: "Lead not found" });
//     return res.status(200).json({ success: true, message: "Lead deleted" });
//   } catch (err) {
//     return res.status(500).json({ message: "Server error", error: err.message });
//   }
// };

// // ═══════════════════════════════════════════════════════════════════════════════
// // GET /api/facebook-leads/fetch/:leadgenId  — manual re-fetch from Graph API
// // ═══════════════════════════════════════════════════════════════════════════════
// export const manualFetch = async (req, res) => {
//   try {
//     const data = await fetchFromGraph(req.params.leadgenId);
//     if (!data) return res.status(404).json({ message: "Not found or API error" });
//     return res.status(200).json({ success: true, data });
//   } catch (err) {
//     return res.status(500).json({ message: "Server error", error: err.message });
//   }
// };


// controllers/facebooklead.controller.js
import FacebookLead from "../models/facebooklead.model.js";
import Lead        from "../models/leads.model.js";   // your existing Lead model
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
   Must respond with hub.challenge when hub.verify_token matches.
───────────────────────────────────────────────────────────────────────────── */
export const verifyWebhook = (req, res) => {
  const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || "123456";

  const mode      = req.query["hub.mode"];
  const token     = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  console.log("📘 Facebook webhook verification attempt:", { mode, token });

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Facebook webhook verified successfully");
    return res.status(200).send(challenge);
  }

  console.warn("❌ Facebook webhook verification failed – token mismatch");
  return res.status(403).json({ message: "Verification failed" });
};

/* ─────────────────────────────────────────────────────────────────────────────
   POST /api/facebook-leads/webhook
   Facebook sends lead data here when a user fills out a Lead Ad form.
───────────────────────────────────────────────────────────────────────────── */
export const receiveWebhook = async (req, res) => {
  // Always respond 200 first so Facebook doesn't retry aggressively
  res.status(200).json({ status: "EVENT_RECEIVED" });

  try {
    const body = req.body;

    if (body.object !== "page") {
      console.log("📘 Facebook webhook – not a page event, ignoring");
      return;
    }

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== "leadgen") continue;

        const value      = change.value || {};
        const leadgenId  = value.leadgen_id;
        const pageId     = value.page_id  || entry.id;
        const formId     = value.form_id;
        const adId       = value.ad_id;
        const adgroupId  = value.adgroup_id;

        console.log("📘 New Facebook lead event:", { leadgenId, pageId, formId });

        if (!leadgenId) continue;

        // ── Fetch full lead data from Facebook Graph API ──────────────
        let fieldData  = [];
        let parsedData = { fullName: "", email: "", phoneNumber: "", state: "" };

        try {
          const graphRes = await axios.get(
            `https://graph.facebook.com/v19.0/${leadgenId}`,
            {
              params: {
                access_token: process.env.FB_PAGE_ACCESS_TOKEN,
                fields: "field_data,created_time,ad_id,adgroup_id,form_id",
              },
            }
          );
          fieldData  = graphRes.data.field_data || [];
          parsedData = parseFieldData(fieldData);
          console.log("📘 Fetched lead field data:", parsedData);
        } catch (graphErr) {
          console.error("⚠️  Failed to fetch lead from Graph API:", graphErr.response?.data || graphErr.message);
        }

        // ── Save to FacebookLead collection ───────────────────────────
        let fbLead;
        try {
          fbLead = await FacebookLead.findOneAndUpdate(
            { leadId: leadgenId },
            {
              leadId:      leadgenId,
              pageId,
              formId,
              adId,
              adgroupId,
              fullName:    parsedData.fullName,
              email:       parsedData.email,
              phoneNumber: parsedData.phoneNumber,
              state:       parsedData.state,
              rawFieldData: fieldData,
            },
            { upsert: true, new: true }
          );
        } catch (dbErr) {
          console.error("❌ Failed to save FacebookLead:", dbErr.message);
          continue;
        }

        // ── Sync to main Lead collection ──────────────────────────────
        try {
          const existingLead = await Lead.findOne({ facebookLeadId: leadgenId });

          if (!existingLead) {
            const newLead = await Lead.create({
              leadName:      parsedData.fullName  || "Facebook Lead",
              email:         parsedData.email,
              phoneNumber:   parsedData.phoneNumber,
              state:         parsedData.state,
              source:        "Facebook",
              status:        "Cold",
              facebookLeadId: leadgenId,
            });

            await FacebookLead.findByIdAndUpdate(fbLead._id, {
              crmLeadId: newLead._id,
              synced:    true,
            });

            console.log("✅ Lead synced to CRM:", newLead._id);
          } else {
            console.log("📘 Lead already exists in CRM:", existingLead._id);
          }
        } catch (syncErr) {
          console.error("❌ Lead sync failed:", syncErr.message);
          await FacebookLead.findByIdAndUpdate(fbLead._id, {
            syncError: syncErr.message,
          });
        }
      }
    }
  } catch (err) {
    console.error("❌ Facebook webhook processing error:", err.message);
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
      FacebookLead.find().sort({ createdAt: -1 }).skip(skip).limit(limit).populate("crmLeadId", "leadName status"),
      FacebookLead.countDocuments(),
    ]);

    res.json({ leads, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch Facebook leads", error: err.message });
  }
};