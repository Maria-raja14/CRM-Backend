// // services/tripmagicPoller.service.js
// // Polls Gmail inbox for new TripMagics lead emails,
// // parses them, saves leads to MongoDB, and emits real-time socket events.

// import { initializeGmailClient } from "../utils/gmailService.js";
// import { isTripMagicEmail, parseTripMagicLead, getTripMagicMessageId } from "./tripmagicParser.service.js";
// import Lead from "../models/leads.model.js";
// import TripmagicLog from "../models/tripmagicLog.model.js";
// import GmailToken from "../models/GmailToken.js";
// import { notifyUser, notifyAdmins } from "../realtime/socket.js";
// import userModel from "../models/user.model.js";

// // ── Config ──────────────────────────────────────────────────────────────────
// const POLL_INTERVAL_MS    = 2 * 60 * 1000;  // Poll every 2 minutes
// const INITIAL_DELAY_MS    = 15 * 1000;       // Wait 15 s after server start
// const LOOK_BACK_HOURS     = 24;              // On first run, look back 24 hours
// const MAX_RESULTS_PER_POLL = 20;

// let pollerTimer    = null;
// let isPollerActive = false;
// let lastHistoryId  = null;

// // ── Round-robin sales user picker (same logic as leads controller) ──────────
// const pickNextSalesUser = async () => {
//   try {
//     const users = await userModel
//       .find({})
//       .populate("role", "name")
//       .select("_id firstName lastName role createdAt")
//       .sort({ createdAt: 1, _id: 1 })
//       .lean();

//     const salesUsers = users.filter((u) => {
//       const roleName = typeof u.role === "string" ? u.role : u.role?.name || "";
//       return String(roleName).toLowerCase() === "sales";
//     });

//     if (!salesUsers.length) return null;

//     const lastLead = await Lead.findOne({ assignTo: { $ne: null } })
//       .sort({ createdAt: -1, _id: -1 })
//       .select("assignTo")
//       .lean();

//     if (!lastLead?.assignTo) return salesUsers[0]._id;
//     const lastIdx = salesUsers.findIndex(
//       (u) => u._id.toString() === lastLead.assignTo.toString()
//     );
//     const nextIdx = lastIdx === -1 ? 0 : (lastIdx + 1) % salesUsers.length;
//     return salesUsers[nextIdx]._id;
//   } catch (err) {
//     console.error("❌ [TripMagicPoller] pickNextSalesUser error:", err.message);
//     return null;
//   }
// };

// // ── Extract content from Gmail message payload ───────────────────────────────
// function getHeader(headers, name) {
//   if (!headers || !Array.isArray(headers)) return "";
//   const lower = name.toLowerCase();
//   const found = headers.find((h) => h.name && h.name.toLowerCase() === lower);
//   return found ? found.value || "" : "";
// }

// function extractBodyContent(payload) {
//   if (!payload) return { text: "", html: "" };
//   let text = "";
//   let html = "";

//   function process(part) {
//     if (!part) return;
//     const mimeType = part.mimeType || "";
//     const body     = part.body     || {};

//     if (mimeType === "text/plain" && body.data && !text) {
//       try { text = Buffer.from(body.data, "base64").toString("utf-8"); } catch {}
//     } else if (mimeType === "text/html" && body.data) {
//       try { html = Buffer.from(body.data, "base64").toString("utf-8"); } catch {}
//     }
//     if (part.parts) part.parts.forEach(process);
//   }

//   process(payload);
//   return { text, html };
// }

// // ── Process a single Gmail message ───────────────────────────────────────────
// async function processGmailMessage(gmail, messageId, emailAccount) {
//   // 1. Check if already processed (dedup)
//   const alreadyDone = await TripmagicLog.findOne({ gmailMessageId: messageId });
//   if (alreadyDone) {
//     console.log(`⏭️  [TripMagicPoller] Already processed message ${messageId}`);
//     return null;
//   }

//   // 2. Fetch full message
//   let msgData;
//   try {
//     const res = await gmail.users.messages.get({
//       userId: "me",
//       id:     messageId,
//       format: "full",
//     });
//     msgData = res.data;
//   } catch (err) {
//     console.error(`❌ [TripMagicPoller] Failed to fetch message ${messageId}:`, err.message);
//     return null;
//   }

//   const headers  = msgData.payload?.headers || [];
//   const from     = getHeader(headers, "From");
//   const subject  = getHeader(headers, "Subject");
//   const dateHdr  = getHeader(headers, "Date");
//   const content  = extractBodyContent(msgData.payload);

//   const message = {
//     id:       messageId,
//     from,
//     subject,
//     date:     dateHdr,
//     body:     content.text,
//     htmlBody: content.html,
//     snippet:  msgData.snippet || "",
//   };

//   // 3. Check if it's a TripMagics email
//   if (!isTripMagicEmail(message)) {
//     console.log(`⏭️  [TripMagicPoller] Not a TripMagics email — skip (${subject})`);
//     return null;
//   }

//   console.log(`🎯 [TripMagicPoller] TripMagics email detected: "${subject}" from ${from}`);

//   // 4. Parse lead data
//   let leadData;
//   try {
//     leadData = parseTripMagicLead(message);
//   } catch (err) {
//     await TripmagicLog.create({
//       gmailMessageId: messageId,
//       gmailThreadId:  msgData.threadId,
//       status: "failed",
//       error:  `Parse error: ${err.message}`,
//     });
//     console.error(`❌ [TripMagicPoller] Parse failed for ${messageId}:`, err.message);
//     return null;
//   }

//   // 5. Validate minimum required fields
//   if (!leadData.leadName || !leadData.phoneNumber) {
//     console.warn(`⚠️  [TripMagicPoller] Skipping — missing name or phone in message ${messageId}`);
//     await TripmagicLog.create({
//       gmailMessageId: messageId,
//       gmailThreadId:  msgData.threadId,
//       status: "skipped",
//       error:  "Missing leadName or phoneNumber",
//     });
//     return null;
//   }

//   // 6. Check for duplicate lead (same phone + source)
//   const existingLead = await Lead.findOne({
//     phoneNumber: leadData.phoneNumber,
//     source:      "Trip Magic",
//   }).lean();

//   if (existingLead) {
//     console.log(`⏭️  [TripMagicPoller] Duplicate phone ${leadData.phoneNumber} — skipping`);
//     await TripmagicLog.create({
//       gmailMessageId: messageId,
//       gmailThreadId:  msgData.threadId,
//       leadId:   existingLead._id,
//       leadName: existingLead.leadName,
//       phone:    leadData.phoneNumber,
//       status:   "skipped",
//       error:    "Duplicate phone number",
//     });
//     return null;
//   }

//   // 7. Assign to next sales user via round-robin
//   const assignTo = await pickNextSalesUser();

//   // 8. Save lead to DB
//   const travelDate = leadData.travelDate ? new Date(leadData.travelDate) : null;

//   const lead = new Lead({
//     leadName:    leadData.leadName,
//     phoneNumber: leadData.phoneNumber,
//     email:       leadData.email       || "",
//     destination: leadData.destination || "",
//     country:     leadData.country     || "India",
//     source:      "Trip Magic",
//     status:      "Cold",
//     fromEmail: true,   // ← only the poller does this
//     notes:       leadData.notes       || "",
//     noOfAdults:  leadData.noOfAdults  ?? null,
//     noOfChildren: leadData.noOfChildren ?? null,
//     travelDate,
//     assignTo,
//     lastReminderAt: null,
//     followUpDate:   null,
//   });

//   const savedLead = await lead.save();

//   // 9. Populate assignTo for socket event
//   const populatedLead = await Lead.findById(savedLead._id)
//     .populate("assignTo", "firstName lastName email role")
//     .lean();

//   console.log(
//     `✅ [TripMagicPoller] Lead created: "${savedLead.leadName}" (${savedLead._id}) from Gmail message ${messageId}`
//   );

//   // 10. Log processed message
//   await TripmagicLog.create({
//     gmailMessageId: messageId,
//     gmailThreadId:  msgData.threadId,
//     leadId:   savedLead._id,
//     leadName: savedLead.leadName,
//     email:    savedLead.email,
//     phone:    savedLead.phoneNumber,
//     status:   "processed",
//   });

//   // 11. Real-time notification — emit to assignee and all admins
//   if (assignTo) {
//     notifyUser(String(assignTo), "new_tripmagic_lead", {
//       lead:    populatedLead,
//       message: `New TripMagics lead: ${savedLead.leadName}`,
//     });
//   }

//   // Notify admins
//   try {
//     const admins = await userModel
//       .find({})
//       .populate("role", "name")
//       .select("_id role")
//       .lean();
//     const adminIds = admins
//       .filter((u) => {
//         const rn = typeof u.role === "string" ? u.role : u.role?.name || "";
//         return String(rn).toLowerCase() === "admin";
//       })
//       .map((u) => String(u._id));

//     notifyAdmins(adminIds, "new_tripmagic_lead", {
//       lead:    populatedLead,
//       message: `New TripMagics lead: ${savedLead.leadName}`,
//     });
//   } catch {}

//   return populatedLead;
// }

// // ── Main poll function ────────────────────────────────────────────────────────
// async function pollTripMagicEmails() {
//   if (isPollerActive) {
//     console.log("⏳ [TripMagicPoller] Previous poll still running — skipping");
//     return;
//   }

//   isPollerActive = true;
//   console.log("🔄 [TripMagicPoller] Starting poll...");

//   try {
//     // Get all active Gmail accounts
//     const accounts = await GmailToken.find({ is_active: true }).lean();
//     if (!accounts.length) {
//       console.log("📭 [TripMagicPoller] No active Gmail accounts");
//       return;
//     }

//     for (const account of accounts) {
//       try {
//         await pollForAccount(account.email);
//       } catch (err) {
//         console.error(`❌ [TripMagicPoller] Error polling ${account.email}:`, err.message);
//       }
//     }
//   } catch (err) {
//     console.error("❌ [TripMagicPoller] Fatal error:", err.message);
//   } finally {
//     isPollerActive = false;
//   }
// }

// async function pollForAccount(emailAccount) {
//   let gmail;
//   try {
//     gmail = await initializeGmailClient(emailAccount);
//   } catch (err) {
//     console.warn(`⚠️  [TripMagicPoller] Cannot init Gmail for ${emailAccount}: ${err.message}`);
//     return;
//   }

//   // Build query — look for TripMagics emails
//   // Search by sender domain OR subject
//   const q = `from:tripmagic OR from:noreply@tripmagics.com OR subject:TripMagics is:unread`;

//   // For first run, look back 24 hours; afterwards use "newer_than:3d" for safety
//   const timeFilter = "newer_than:3d";
//   const fullQuery  = `${q} ${timeFilter}`;

//   console.log(`📧 [TripMagicPoller] Querying Gmail [${emailAccount}]: ${fullQuery}`);

//   let listRes;
//   try {
//     listRes = await gmail.users.messages.list({
//       userId:     "me",
//       q:          fullQuery,
//       maxResults: MAX_RESULTS_PER_POLL,
//     });
//   } catch (err) {
//     console.error(`❌ [TripMagicPoller] Gmail list error for ${emailAccount}:`, err.message);
//     return;
//   }

//   const messages = listRes.data.messages || [];
//   if (!messages.length) {
//     console.log(`📭 [TripMagicPoller] No TripMagics messages found for ${emailAccount}`);
//     return;
//   }

//   console.log(`📬 [TripMagicPoller] Found ${messages.length} candidate message(s) for ${emailAccount}`);

//   const newLeads = [];
//   for (const msg of messages) {
//     try {
//       const lead = await processGmailMessage(gmail, msg.id, emailAccount);
//       if (lead) newLeads.push(lead);
//     } catch (err) {
//       console.error(`❌ [TripMagicPoller] Error processing message ${msg.id}:`, err.message);
//     }
//   }

//   if (newLeads.length) {
//     console.log(`✅ [TripMagicPoller] Created ${newLeads.length} new lead(s) from TripMagics emails`);
//   }
// }

// // ── Public API ────────────────────────────────────────────────────────────────

// /**
//  * Start the poller — call once from server startup
//  */
// export function startTripMagicPoller() {
//   console.log(`🚀 [TripMagicPoller] Starting (interval: ${POLL_INTERVAL_MS / 1000}s, initial delay: ${INITIAL_DELAY_MS / 1000}s)`);

//   // Initial run after short delay (let server/DB fully start)
//   setTimeout(async () => {
//     await pollTripMagicEmails();
//     // Then schedule recurring
//     pollerTimer = setInterval(pollTripMagicEmails, POLL_INTERVAL_MS);
//   }, INITIAL_DELAY_MS);
// }

// /**
//  * Stop the poller
//  */
// export function stopTripMagicPoller() {
//   if (pollerTimer) {
//     clearInterval(pollerTimer);
//     pollerTimer = null;
//     console.log("🛑 [TripMagicPoller] Stopped");
//   }
// }

// /**
//  * Manually trigger a poll (for testing / API endpoint)
//  */
// export async function triggerTripMagicPoll() {
//   await pollTripMagicEmails();
// }//originall




// services/tripmagicPoller.service.js
// Polls Gmail inbox for new TripMagics lead emails,
// parses them, saves leads to MongoDB, and emits real-time socket events.

import { initializeGmailClient } from "../utils/gmailService.js";
import { isTripMagicEmail, parseTripMagicLead, getTripMagicMessageId } from "./tripmagicParser.service.js";
import Lead from "../models/leads.model.js";
import TripmagicLog from "../models/tripmagicLog.model.js";
import GmailToken from "../models/GmailToken.js";
import { notifyUser, notifyAdmins } from "../realtime/socket.js";
import userModel from "../models/user.model.js";

// ── Config ───────────────────────────────────────────────────────────────────
const POLL_INTERVAL_MS     = 2 * 60 * 1000;  // Poll every 2 minutes
const INITIAL_DELAY_MS     = 15 * 1000;       // Wait 15 s after server start
const MAX_RESULTS_PER_POLL = 20;

let pollerTimer    = null;
let isPollerActive = false;

// ── Round-robin sales user picker ────────────────────────────────────────────
const pickNextSalesUser = async () => {
  try {
    const users = await userModel
      .find({})
      .populate("role", "name")
      .select("_id firstName lastName role createdAt")
      .sort({ createdAt: 1, _id: 1 })
      .lean();

    const salesUsers = users.filter((u) => {
      const roleName = typeof u.role === "string" ? u.role : u.role?.name || "";
      return String(roleName).toLowerCase() === "sales";
    });

    if (!salesUsers.length) return null;

    const lastLead = await Lead.findOne({ assignTo: { $ne: null } })
      .sort({ createdAt: -1, _id: -1 })
      .select("assignTo")
      .lean();

    if (!lastLead?.assignTo) return salesUsers[0]._id;
    const lastIdx = salesUsers.findIndex(
      (u) => u._id.toString() === lastLead.assignTo.toString()
    );
    const nextIdx = lastIdx === -1 ? 0 : (lastIdx + 1) % salesUsers.length;
    return salesUsers[nextIdx]._id;
  } catch (err) {
    console.error("❌ [TripMagicPoller] pickNextSalesUser error:", err.message);
    return null;
  }
};

// ── Extract content from Gmail message payload ────────────────────────────────
function getHeader(headers, name) {
  if (!headers || !Array.isArray(headers)) return "";
  const lower = name.toLowerCase();
  const found = headers.find((h) => h.name && h.name.toLowerCase() === lower);
  return found ? found.value || "" : "";
}

function extractBodyContent(payload) {
  if (!payload) return { text: "", html: "" };
  let text = "";
  let html = "";

  function process(part) {
    if (!part) return;
    const mimeType = part.mimeType || "";
    const body     = part.body     || {};

    if (mimeType === "text/plain" && body.data && !text) {
      try { text = Buffer.from(body.data, "base64").toString("utf-8"); } catch {}
    } else if (mimeType === "text/html" && body.data) {
      try { html = Buffer.from(body.data, "base64").toString("utf-8"); } catch {}
    }
    if (part.parts) part.parts.forEach(process);
  }

  process(payload);
  return { text, html };
}

// ── Process a single Gmail message ────────────────────────────────────────────
async function processGmailMessage(gmail, messageId, emailAccount) {
  // 1. Check if already processed (dedup)
  const alreadyDone = await TripmagicLog.findOne({ gmailMessageId: messageId });
  if (alreadyDone) {
    console.log(`⏭️  [TripMagicPoller] Already processed message ${messageId}`);
    return null;
  }

  // 2. Fetch full message
  let msgData;
  try {
    const res = await gmail.users.messages.get({
      userId: "me",
      id:     messageId,
      format: "full",
    });
    msgData = res.data;
  } catch (err) {
    console.error(`❌ [TripMagicPoller] Failed to fetch message ${messageId}:`, err.message);
    return null;
  }

  const headers = msgData.payload?.headers || [];
  const from    = getHeader(headers, "From");
  const subject = getHeader(headers, "Subject");
  const dateHdr = getHeader(headers, "Date");
  const content = extractBodyContent(msgData.payload);

  const message = {
    id:       messageId,
    from,
    subject,
    date:     dateHdr,
    body:     content.text,
    htmlBody: content.html,
    snippet:  msgData.snippet || "",
  };

  // 3. Check if it's a TripMagics email
  if (!isTripMagicEmail(message)) {
    console.log(`⏭️  [TripMagicPoller] Not a TripMagics email — skip (${subject})`);
    return null;
  }

  console.log(`🎯 [TripMagicPoller] TripMagics email detected: "${subject}" from ${from}`);

  // 4. Parse lead data
  let leadData;
  try {
    leadData = parseTripMagicLead(message);
  } catch (err) {
    await TripmagicLog.create({
      gmailMessageId: messageId,
      gmailThreadId:  msgData.threadId,
      status: "failed",
      error:  `Parse error: ${err.message}`,
    });
    console.error(`❌ [TripMagicPoller] Parse failed for ${messageId}:`, err.message);
    return null;
  }

  // ✅ DEBUG: Log parsed lead data to verify destination and fields
  console.log(`[TripMagicPoller] Parsed lead data for ${messageId}:`, {
    leadName:    leadData.leadName,
    phoneNumber: leadData.phoneNumber,
    destination: leadData.destination,
    noOfAdults:  leadData.noOfAdults,
    noOfChildren: leadData.noOfChildren,
    travelDate:  leadData.travelDate,
  });

  // 5. Validate minimum required fields
  if (!leadData.leadName || !leadData.phoneNumber) {
    console.warn(`⚠️  [TripMagicPoller] Skipping — missing name or phone in message ${messageId}`);
    await TripmagicLog.create({
      gmailMessageId: messageId,
      gmailThreadId:  msgData.threadId,
      status: "skipped",
      error:  "Missing leadName or phoneNumber",
    });
    return null;
  }

  // 6. Check for duplicate lead (same phone + source)
  const existingLead = await Lead.findOne({
    phoneNumber: leadData.phoneNumber,
    source:      "Trip Magic",
  }).lean();

  if (existingLead) {
    console.log(`⏭️  [TripMagicPoller] Duplicate phone ${leadData.phoneNumber} — skipping`);
    await TripmagicLog.create({
      gmailMessageId: messageId,
      gmailThreadId:  msgData.threadId,
      leadId:   existingLead._id,
      leadName: existingLead.leadName,
      phone:    leadData.phoneNumber,
      status:   "skipped",
      error:    "Duplicate phone number",
    });
    return null;
  }

  // 7. Assign to next sales user via round-robin
  const assignTo = await pickNextSalesUser();

  // 8. Save lead to DB
  // ✅ FIX: fromEmail: true is explicitly set — this is what triggers the TM badge in the UI
  // ✅ FIX: destination uses leadData.destination directly (parsed "To City" value)
  const travelDate = leadData.travelDate ? new Date(leadData.travelDate) : null;

  const lead = new Lead({
    leadName:     leadData.leadName,
    phoneNumber:  leadData.phoneNumber,
    email:        leadData.email        || "",
    destination:  leadData.destination  || "Unknown",  // ✅ city name from "To City" field
    country:      leadData.country      || "India",
    source:       "Trip Magic",
    status:       "Cold",
    fromEmail:    true,   // ✅ CRITICAL — only the poller sets this; manual leads never set this
    notes:        leadData.notes        || "",
    noOfAdults:   leadData.noOfAdults   ?? null,
    noOfChildren: leadData.noOfChildren ?? null,
    travelDate,
    assignTo,
    lastReminderAt: null,
    followUpDate:   null,
  });

  const savedLead = await lead.save();

  // 9. ✅ FIX: Populate assignTo AND include fromEmail in the populated result
  //    Use explicit select to ensure fromEmail is included in socket payload
  const populatedLead = await Lead.findById(savedLead._id)
    .populate("assignTo", "firstName lastName email role")
    .select("+fromEmail")   // ✅ explicitly include fromEmail in the returned document
    .lean();

  console.log(
    `✅ [TripMagicPoller] Lead created: "${savedLead.leadName}" destination="${savedLead.destination}" fromEmail=${savedLead.fromEmail} (${savedLead._id})`
  );

  // 10. Log processed message
  await TripmagicLog.create({
    gmailMessageId: messageId,
    gmailThreadId:  msgData.threadId,
    leadId:   savedLead._id,
    leadName: savedLead.leadName,
    email:    savedLead.email,
    phone:    savedLead.phoneNumber,
    status:   "processed",
  });

  // 11. Real-time notification — emit to assignee and all admins
  if (assignTo) {
    notifyUser(String(assignTo), "new_tripmagic_lead", {
      lead:    populatedLead,
      message: `New TripMagics lead: ${savedLead.leadName}`,
    });
  }

  // Notify admins
  try {
    const admins = await userModel
      .find({})
      .populate("role", "name")
      .select("_id role")
      .lean();
    const adminIds = admins
      .filter((u) => {
        const rn = typeof u.role === "string" ? u.role : u.role?.name || "";
        return String(rn).toLowerCase() === "admin";
      })
      .map((u) => String(u._id));

    notifyAdmins(adminIds, "new_tripmagic_lead", {
      lead:    populatedLead,
      message: `New TripMagics lead: ${savedLead.leadName}`,
    });
  } catch {}

  return populatedLead;
}

// ── Main poll function ─────────────────────────────────────────────────────────
async function pollTripMagicEmails() {
  if (isPollerActive) {
    console.log("⏳ [TripMagicPoller] Previous poll still running — skipping");
    return;
  }

  isPollerActive = true;
  console.log("🔄 [TripMagicPoller] Starting poll...");

  try {
    const accounts = await GmailToken.find({ is_active: true }).lean();
    if (!accounts.length) {
      console.log("📭 [TripMagicPoller] No active Gmail accounts");
      return;
    }

    for (const account of accounts) {
      try {
        await pollForAccount(account.email);
      } catch (err) {
        console.error(`❌ [TripMagicPoller] Error polling ${account.email}:`, err.message);
      }
    }
  } catch (err) {
    console.error("❌ [TripMagicPoller] Fatal error:", err.message);
  } finally {
    isPollerActive = false;
  }
}

async function pollForAccount(emailAccount) {
  let gmail;
  try {
    gmail = await initializeGmailClient(emailAccount);
  } catch (err) {
    console.warn(`⚠️  [TripMagicPoller] Cannot init Gmail for ${emailAccount}: ${err.message}`);
    return;
  }

  const q          = `from:tripmagic OR from:noreply@tripmagics.com OR subject:TripMagics`;
  const timeFilter = "newer_than:3d";
  const fullQuery  = `${q} ${timeFilter}`;

  console.log(`📧 [TripMagicPoller] Querying Gmail [${emailAccount}]: ${fullQuery}`);

  let listRes;
  try {
    listRes = await gmail.users.messages.list({
      userId:     "me",
      q:          fullQuery,
      maxResults: MAX_RESULTS_PER_POLL,
    });
  } catch (err) {
    console.error(`❌ [TripMagicPoller] Gmail list error for ${emailAccount}:`, err.message);
    return;
  }

  const messages = listRes.data.messages || [];
  if (!messages.length) {
    console.log(`📭 [TripMagicPoller] No TripMagics messages found for ${emailAccount}`);
    return;
  }

  console.log(`📬 [TripMagicPoller] Found ${messages.length} candidate message(s) for ${emailAccount}`);

  const newLeads = [];
  for (const msg of messages) {
    try {
      const lead = await processGmailMessage(gmail, msg.id, emailAccount);
      if (lead) newLeads.push(lead);
    } catch (err) {
      console.error(`❌ [TripMagicPoller] Error processing message ${msg.id}:`, err.message);
    }
  }

  if (newLeads.length) {
    console.log(`✅ [TripMagicPoller] Created ${newLeads.length} new lead(s) from TripMagics emails`);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function startTripMagicPoller() {
  console.log(`🚀 [TripMagicPoller] Starting (interval: ${POLL_INTERVAL_MS / 1000}s, initial delay: ${INITIAL_DELAY_MS / 1000}s)`);
  setTimeout(async () => {
    await pollTripMagicEmails();
    pollerTimer = setInterval(pollTripMagicEmails, POLL_INTERVAL_MS);
  }, INITIAL_DELAY_MS);
}

export function stopTripMagicPoller() {
  if (pollerTimer) {
    clearInterval(pollerTimer);
    pollerTimer = null;
    console.log("🛑 [TripMagicPoller] Stopped");
  }
}

export async function triggerTripMagicPoll() {
  await pollTripMagicEmails();
}