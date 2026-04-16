// controllers/emailLead.controller.js
//
// HOW IT WORKS
// ─────────────────────────────────────────────────────────────────────────────
// 1. A cron (or manual trigger) calls `pollTripMagicsEmails()` which:
//    a. Reads your connected Gmail inbox via the existing gmailService.
//    b. Looks for emails whose FROM address matches TRIPMATICS_SENDER_EMAIL
//       (set this env var, e.g. "noreply@tripmagics.com").
//    c. Parses name, phone, email, travellers, travel-date from the email body.
//    d. Saves a new EmailLead doc (skips duplicates via messageId).
//    e. Emits "new_email_lead" socket event so the frontend updates in real time.
//
// 2. REST endpoints let the frontend:
//    - GET  /api/email-leads             list (paginated, same filters as leads)
//    - GET  /api/email-leads/:id         single record
//    - PATCH /api/email-leads/:id/status update status
//    - PATCH /api/email-leads/:id/followup update follow-up date
//    - DELETE /api/email-leads/:id       delete
//    - POST /api/email-leads/poll        manually trigger Gmail poll
// ─────────────────────────────────────────────────────────────────────────────

import EmailLead from "../models/emailLead.model.js";
import { initializeGmailClient } from "../utils/gmailService.js";
import GmailToken from "../models/GmailToken.js";
import { notifyUser, connectedUsers } from "../realtime/socket.js";

const TRIPMATICS_SENDER = (process.env.TRIPMATICS_SENDER_EMAIL || "").toLowerCase().trim();
const ITEMS_PER_PAGE    = 10;

// ── Round-robin (reuse same helper pattern as leads controller) ────────────────
import userModel from "../models/user.model.js";
import Lead      from "../models/leads.model.js";

const pickNextSalesUser = async () => {
  const users = await userModel
    .find({}).populate("role", "name")
    .select("_id firstName lastName role createdAt")
    .sort({ createdAt: 1, _id: 1 }).lean();

  const salesUsers = users.filter((u) => {
    const roleName = typeof u.role === "string" ? u.role : u.role?.name || u.role?.roleName || "";
    return String(roleName).toLowerCase() === "sales";
  });

  if (!salesUsers.length) return null;

  const lastLead = await Lead.findOne({ assignTo: { $ne: null } })
    .sort({ createdAt: -1, _id: -1 }).select("assignTo").lean();

  if (!lastLead?.assignTo) return salesUsers[0]._id;
  const lastIdx = salesUsers.findIndex((u) => u._id.toString() === lastLead.assignTo.toString());
  const nextIdx = lastIdx === -1 ? 0 : (lastIdx + 1) % salesUsers.length;
  return salesUsers[nextIdx]._id;
};

// ── Parse helpers ─────────────────────────────────────────────────────────────

/**
 * Try to extract a value from an email body using multiple regex patterns.
 * Each pattern should have one capture group.
 */
function extract(body, patterns) {
  for (const re of patterns) {
    const m = body.match(re);
    if (m && m[1]) return m[1].trim();
  }
  return null;
}

/**
 * Parse a TripMagics-style lead email body into structured fields.
 * Adjust the patterns below to match the exact format TripMagics sends.
 *
 * TripMagics typically sends something like:
 *   Name: John Doe
 *   Email: john@example.com
 *   Phone: +91 9876543210
 *   Destination: Dubai
 *   Travel Date: 2025-12-01
 *   No. of Adults: 2
 *   No. of Children: 1
 *   Message / Requirements: Looking for a 5-star package
 */
function parseTripMagicsEmail(subject, body) {
  const b = body || "";

  const name = extract(b, [
    /Name\s*[:\-]\s*(.+)/i,
    /Customer\s*[:\-]\s*(.+)/i,
    /Full\s*Name\s*[:\-]\s*(.+)/i,
    /Guest\s*Name\s*[:\-]\s*(.+)/i,
  ]) || "TripMagics Lead";

  const email = extract(b, [
    /Email\s*[:\-]\s*([^\s\n]+)/i,
    /E-?mail\s*[:\-]\s*([^\s\n]+)/i,
  ]) || "";

  const phone = extract(b, [
    /Phone\s*[:\-]\s*([+\d\s\-().]+)/i,
    /Mobile\s*[:\-]\s*([+\d\s\-().]+)/i,
    /Contact\s*[:\-]\s*([+\d\s\-().]+)/i,
    /Whatsapp\s*[:\-]\s*([+\d\s\-().]+)/i,
  ]);
  const phoneClean = phone ? phone.replace(/\s+/g, "").trim() : "";

  const destination = extract(b, [
    /Destination\s*[:\-]\s*(.+)/i,
    /Tour\s*Destination\s*[:\-]\s*(.+)/i,
    /Travel\s*To\s*[:\-]\s*(.+)/i,
    /Package\s*[:\-]\s*(.+)/i,
  ]) || "Not Specified";

  const country = extract(b, [
    /Country\s*[:\-]\s*(.+)/i,
    /Nationality\s*[:\-]\s*(.+)/i,
  ]) || "";

  const travelDateRaw = extract(b, [
    /Travel\s*Date\s*[:\-]\s*(.+)/i,
    /Departure\s*Date\s*[:\-]\s*(.+)/i,
    /Trip\s*Date\s*[:\-]\s*(.+)/i,
    /Date\s*of\s*Travel\s*[:\-]\s*(.+)/i,
    /Preferred\s*Date\s*[:\-]\s*(.+)/i,
  ]);
  let travelDate = null;
  if (travelDateRaw) {
    const d = new Date(travelDateRaw);
    if (!isNaN(d.getTime())) travelDate = d;
  }

  const adultsRaw = extract(b, [
    /No\.?\s*of\s*Adults?\s*[:\-]\s*(\d+)/i,
    /Adults?\s*[:\-]\s*(\d+)/i,
    /Pax\s*[:\-]\s*(\d+)/i,
    /Number\s*of\s*Adults?\s*[:\-]\s*(\d+)/i,
  ]);
  const noOfAdults = adultsRaw ? parseInt(adultsRaw, 10) : null;

  const childrenRaw = extract(b, [
    /No\.?\s*of\s*Children\s*[:\-]\s*(\d+)/i,
    /Children\s*[:\-]\s*(\d+)/i,
    /Kids?\s*[:\-]\s*(\d+)/i,
    /Child\s*[:\-]\s*(\d+)/i,
  ]);
  const noOfChildren = childrenRaw ? parseInt(childrenRaw, 10) : null;

  const requirement = extract(b, [
    /Message\s*[:\-]\s*([\s\S]+)/i,
    /Requirements?\s*[:\-]\s*([\s\S]+)/i,
    /Note\s*[:\-]\s*([\s\S]+)/i,
    /Comments?\s*[:\-]\s*([\s\S]+)/i,
    /Enquiry\s*[:\-]\s*([\s\S]+)/i,
  ]) || "";

  const duration = extract(b, [
    /Duration\s*[:\-]\s*(.+)/i,
    /No\.?\s*of\s*Nights?\s*[:\-]\s*(.+)/i,
    /Nights?\s*[:\-]\s*(.+)/i,
  ]) || "";

  return { name, email, phone: phoneClean, destination, country, travelDate, noOfAdults, noOfChildren, requirement, duration };
}

// ── Gmail body decoder ────────────────────────────────────────────────────────

function decodeBase64Url(data) {
  if (!data) return "";
  try {
    return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
  } catch {
    return "";
  }
}

function extractPlainText(payload) {
  if (!payload) return "";
  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      const text = extractPlainText(part);
      if (text) return text;
    }
  }
  return "";
}

function getHeader(headers, name) {
  if (!headers) return "";
  const found = headers.find((h) => h.name?.toLowerCase() === name.toLowerCase());
  return found?.value || "";
}

// ── Core poll function ────────────────────────────────────────────────────────

/**
 * Poll Gmail for TripMagics lead emails.
 * Called by cron or manual POST /api/email-leads/poll
 * Returns { created, skipped }
 */
export async function pollTripMagicsEmails() {
  // Find any active Gmail token to use
  const tokenDoc = await GmailToken.findOne({ is_active: true }).sort({ last_connected: -1 });
  if (!tokenDoc) {
    console.log("📧 [emailLead] No active Gmail token — skipping poll");
    return { created: 0, skipped: 0 };
  }

  const gmail = await initializeGmailClient(tokenDoc.email);

  // Build search query — if env var set, filter by sender; else grab all unread
  let query = "is:unread";
  if (TRIPMATICS_SENDER) {
    query += ` from:${TRIPMATICS_SENDER}`;
  } else {
    // Fallback: look for common TripMagics subject patterns
    query += ' subject:"New Enquiry" OR subject:"Travel Enquiry" OR subject:"New Lead" OR subject:"Booking Enquiry"';
  }

  console.log(`📧 [emailLead] Polling Gmail (${tokenDoc.email}) | query: "${query}"`);

  let messageList;
  try {
    const res = await gmail.users.messages.list({
      userId: "me",
      q: query,
      maxResults: 50,
    });
    messageList = res.data.messages || [];
  } catch (err) {
    console.error("📧 [emailLead] Gmail list error:", err.message);
    return { created: 0, skipped: 0 };
  }

  if (!messageList.length) {
    console.log("📧 [emailLead] No matching emails found");
    return { created: 0, skipped: 0 };
  }

  let created = 0;
  let skipped = 0;

  const assignTo = await pickNextSalesUser();

  for (const stub of messageList) {
    try {
      // Check duplicate
      const exists = await EmailLead.findOne({ messageId: stub.id });
      if (exists) { skipped++; continue; }

      // Fetch full message
      const msgRes = await gmail.users.messages.get({
        userId: "me",
        id: stub.id,
        format: "full",
      });

      const msg     = msgRes.data;
      const headers = msg.payload?.headers || [];
      const subject = getHeader(headers, "Subject");
      const from    = getHeader(headers, "From");
      const body    = extractPlainText(msg.payload);

      // Parse lead details from body
      const parsed = parseTripMagicsEmail(subject, body);

      // Save EmailLead
      const lead = new EmailLead({
        leadName:        parsed.name,
        phoneNumber:     parsed.phone,
        email:           parsed.email,
        destination:     parsed.destination,
        country:         parsed.country,
        travelDate:      parsed.travelDate,
        noOfAdults:      parsed.noOfAdults,
        noOfChildren:    parsed.noOfChildren,
        requirement:     parsed.requirement,
        duration:        parsed.duration,
        source:          "Email Lead",
        rawEmailSubject: subject,
        rawEmailBody:    body.slice(0, 2000), // store first 2000 chars
        fromEmail:       from,
        messageId:       stub.id,
        assignTo,
        status:          "Cold",
      });

      await lead.save();
      created++;

      // Mark as read so we don't re-process
      try {
        await gmail.users.messages.modify({
          userId: "me",
          id: stub.id,
          requestBody: { removeLabelIds: ["UNREAD"] },
        });
      } catch { /* non-critical */ }

      // Real-time notification to all connected users
      const populatedLead = await EmailLead.findById(lead._id).populate("assignTo", "firstName lastName email").lean();
      
      // Notify everyone connected
      for (const uid of Object.keys(connectedUsers)) {
        notifyUser(uid, "new_email_lead", populatedLead);
      }

      console.log(`📧 [emailLead] ✅ Created: "${parsed.name}" | phone: ${parsed.phone} | dest: ${parsed.destination}`);
    } catch (err) {
      console.error(`📧 [emailLead] ❌ Error processing message ${stub.id}:`, err.message);
      skipped++;
    }
  }

  console.log(`📧 [emailLead] Poll complete — created: ${created}, skipped: ${skipped}`);
  return { created, skipped };
}

// ── REST controller methods ───────────────────────────────────────────────────

export default {

  /* GET /api/email-leads */
  getEmailLeads: async (req, res) => {
    try {
      const page  = Math.max(1, parseInt(req.query.page)  || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || ITEMS_PER_PAGE);
      const skip  = (page - 1) * limit;

      const roleName = req.user?.role?.name?.toLowerCase();
      const filter   = roleName === "admin" ? {} : { assignTo: req.user._id };

      if (req.query.search) {
        const s = req.query.search;
        filter.$or = [
          { leadName:    { $regex: s, $options: "i" } },
          { email:       { $regex: s, $options: "i" } },
          { phoneNumber: { $regex: s, $options: "i" } },
          { destination: { $regex: s, $options: "i" } },
        ];
      }
      if (req.query.status) filter.status = req.query.status;

      const [leads, total] = await Promise.all([
        EmailLead.find(filter)
          .populate("assignTo", "firstName lastName email role")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        EmailLead.countDocuments(filter),
      ]);

      res.status(200).json({
        leads,
        totalLeads:  total,
        totalPages:  Math.ceil(total / limit),
        currentPage: page,
      });
    } catch (err) {
      console.error("❌ [getEmailLeads]", err.message);
      res.status(500).json({ message: err.message });
    }
  },

  /* GET /api/email-leads/:id */
  getEmailLeadById: async (req, res) => {
    try {
      const lead = await EmailLead.findById(req.params.id).populate("assignTo", "firstName lastName email role");
      if (!lead) return res.status(404).json({ message: "Email lead not found" });
      res.status(200).json(lead);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  /* PATCH /api/email-leads/:id/status */
  updateStatus: async (req, res) => {
    try {
      const { status } = req.body;
      if (!status) return res.status(400).json({ message: "status required" });
      const lead = await EmailLead.findByIdAndUpdate(
        req.params.id, { status }, { new: true }
      ).populate("assignTo", "firstName lastName email");
      if (!lead) return res.status(404).json({ message: "Not found" });
      res.status(200).json({ message: "Status updated", lead });
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  },

  /* PATCH /api/email-leads/:id/followup */
  updateFollowUp: async (req, res) => {
    try {
      const { followUpDate } = req.body;
      if (!followUpDate) return res.status(400).json({ message: "followUpDate required" });
      const lead = await EmailLead.findByIdAndUpdate(
        req.params.id, { followUpDate, lastReminderAt: null }, { new: true }
      ).populate("assignTo", "firstName lastName email");
      if (!lead) return res.status(404).json({ message: "Not found" });
      res.status(200).json({ message: "Follow-up date updated", lead });
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  },

  /* DELETE /api/email-leads/:id */
  deleteEmailLead: async (req, res) => {
    try {
      const lead = await EmailLead.findByIdAndDelete(req.params.id);
      if (!lead) return res.status(404).json({ message: "Not found" });
      res.status(200).json({ message: "Email lead deleted" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  /* POST /api/email-leads/poll — manual trigger */
  triggerPoll: async (req, res) => {
    try {
      const result = await pollTripMagicsEmails();
      res.status(200).json({ message: "Poll complete", ...result });
    } catch (err) {
      console.error("❌ [emailLead poll]", err.message);
      res.status(500).json({ message: err.message });
    }
  },
};