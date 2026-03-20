// // controllers/call.controller.js
// import Call from "../models/Call.model.js";
// import twilio from "twilio";
// import dotenv from "dotenv";
// import { notifyUser, connectedUsers } from "../realtime/socket.js";

// dotenv.config();

// const accountSid = process.env.TWILIO_ACCOUNT_SID;
// const authToken  = process.env.TWILIO_AUTH_TOKEN;
// const twilioClient = twilio(accountSid, authToken);

// // ─── Your Twilio voice number (the number that receives / makes calls) ────────
// const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_WHATSAPP_FROM?.replace("whatsapp:", "") || "";

// // ─── Helper: broadcast to all connected CRM users ─────────────────────────────
// const broadcast = (event, payload) => {
//   Object.keys(connectedUsers).forEach((uid) => notifyUser(uid, event, payload));
// };

// /* ═══════════════════════════════════════════════════════════════════════════════
//    1.  INBOUND CALL WEBHOOK  —  POST /api/call/webhook
//        Twilio calls this URL when a call comes in.
//        ➤ Set this URL in Twilio Console:
//          Phone Numbers → Manage → Active Numbers → your number
//          → Voice & Fax → "A Call Comes In" → Webhook → POST
//          URL: https://yourdomain.com/api/call/webhook
//    ═══════════════════════════════════════════════════════════════════════════════ */
// export const inboundCallWebhook = async (req, res) => {
//   try {
//     const {
//       CallSid,
//       From,
//       To,
//       CallStatus,
//       Direction,
//       CallerName,
//       AccountSid,
//     } = req.body;

//     console.log(`📞 Inbound call | SID: ${CallSid} | From: ${From} | Status: ${CallStatus}`);

//     // ── Upsert call record ────────────────────────────────────────────────────
//     await Call.findOneAndUpdate(
//       { callSid: CallSid },
//       {
//         callSid:    CallSid,
//         from:       From       || "",
//         to:         To         || "",
//         status:     CallStatus || "ringing",
//         direction:  Direction  || "inbound",
//         callerName: CallerName || "",
//         accountSid: AccountSid || "",
//         startTime:  new Date(),
//       },
//       { upsert: true, new: true, setDefaultsOnInsert: true }
//     );

//     // ── Notify all CRM agents in real-time ────────────────────────────────────
//     broadcast("call_incoming", {
//       callSid:    CallSid,
//       from:       From,
//       to:         To,
//       callerName: CallerName || "",
//       status:     CallStatus || "ringing",
//       direction:  Direction  || "inbound",
//       startTime:  new Date(),
//     });

//     // ── Respond with TwiML (required by Twilio) ───────────────────────────────
//     // This tells Twilio what to do with the call:
//     // Option A: Simply ring / record — adapt as needed
//     const twiml = `<?xml version="1.0" encoding="UTF-8"?>
// <Response>
//   <Say voice="alice">Thank you for calling. Please hold while we connect you.</Say>
//   <Dial record="record-from-ringing" recordingStatusCallback="${process.env.BACKEND_URL || ""}/api/call/recording-callback" recordingStatusCallbackMethod="POST">
//     <Number>${TWILIO_PHONE_NUMBER}</Number>
//   </Dial>
// </Response>`;

//     res.set("Content-Type", "text/xml");
//     res.status(200).send(twiml);
//   } catch (err) {
//     console.error("❌ Inbound call webhook error:", err);
//     // Always return valid TwiML so Twilio doesn't retry forever
//     res.set("Content-Type", "text/xml");
//     res.status(200).send("<Response><Say>We are experiencing issues. Please try again later.</Say></Response>");
//   }
// };

// /* ═══════════════════════════════════════════════════════════════════════════════
//    2.  CALL STATUS CALLBACK  —  POST /api/call/status
//        Twilio posts status updates here (ringing → in-progress → completed, etc.)
//        ➤ Set this in Twilio Console:
//          Phone Numbers → your number → Voice & Fax → "Call Status Changes"
//          URL: https://yourdomain.com/api/call/status
//    ═══════════════════════════════════════════════════════════════════════════════ */
// export const callStatusCallback = async (req, res) => {
//   try {
//     const {
//       CallSid,
//       CallStatus,
//       CallDuration,
//       From,
//       To,
//       Direction,
//       CallerName,
//       AccountSid,
//     } = req.body;

//     console.log(`📞 Call status | SID: ${CallSid} | Status: ${CallStatus} | Duration: ${CallDuration}s`);

//     const updateFields = {
//       status: CallStatus,
//     };

//     if (CallDuration)  updateFields.duration  = parseInt(CallDuration, 10);
//     if (CallerName)    updateFields.callerName = CallerName;
//     if (CallStatus === "in-progress") updateFields.startTime = new Date();
//     if (["completed", "busy", "no-answer", "failed", "canceled"].includes(CallStatus)) {
//       updateFields.endTime = new Date();
//     }

//     const call = await Call.findOneAndUpdate(
//       { callSid: CallSid },
//       { $set: updateFields },
//       { upsert: true, new: true, setDefaultsOnInsert: true }
//     );

//     // If upserted and we don't have from/to, set them
//     if (!call.from && From) {
//       await Call.findOneAndUpdate({ callSid: CallSid }, {
//         $set: { from: From, to: To, direction: Direction || "inbound", accountSid: AccountSid || "" }
//       });
//     }

//     // ── Real-time broadcast ───────────────────────────────────────────────────
//     broadcast("call_status_update", {
//       callSid:  CallSid,
//       status:   CallStatus,
//       duration: CallDuration ? parseInt(CallDuration, 10) : 0,
//       from:     From,
//       to:       To,
//     });

//     res.status(200).send("OK");
//   } catch (err) {
//     console.error("❌ Call status callback error:", err);
//     res.status(200).send("OK"); // Always 200 to stop Twilio retries
//   }
// };

// /* ═══════════════════════════════════════════════════════════════════════════════
//    3.  RECORDING CALLBACK  —  POST /api/call/recording-callback
//        Twilio posts this when a recording is ready.
//    ═══════════════════════════════════════════════════════════════════════════════ */
// export const recordingCallback = async (req, res) => {
//   try {
//     const {
//       CallSid,
//       RecordingSid,
//       RecordingUrl,
//       RecordingDuration,
//       RecordingStatus,
//     } = req.body;

//     console.log(`🎙️  Recording ready | SID: ${CallSid} | URL: ${RecordingUrl}`);

//     if (RecordingStatus === "completed" && RecordingUrl) {
//       await Call.findOneAndUpdate(
//         { callSid: CallSid },
//         {
//           $set: {
//             recordingUrl:      RecordingUrl + ".mp3", // Twilio appends format
//             recordingSid:      RecordingSid || "",
//             recordingDuration: parseInt(RecordingDuration, 10) || 0,
//           },
//         }
//       );

//       broadcast("call_recording_ready", {
//         callSid:      CallSid,
//         recordingUrl: RecordingUrl + ".mp3",
//         recordingSid: RecordingSid,
//       });
//     }

//     res.status(200).send("OK");
//   } catch (err) {
//     console.error("❌ Recording callback error:", err);
//     res.status(200).send("OK");
//   }
// };

// /* ═══════════════════════════════════════════════════════════════════════════════
//    4.  MAKE OUTBOUND CALL  —  POST /api/call/outbound
//        CRM agent initiates a call to a customer from the browser.
//    ═══════════════════════════════════════════════════════════════════════════════ */
// export const makeOutboundCall = async (req, res) => {
//   try {
//     const { to, from } = req.body;
//     if (!to) return res.status(400).json({ error: "to (phone number) is required" });

//     const fromNumber = from || TWILIO_PHONE_NUMBER;
//     if (!fromNumber) return res.status(500).json({ error: "TWILIO_PHONE_NUMBER not configured in .env" });

//     // Format the number
//     let toFormatted = to.trim().replace(/[\s\-().]/g, "");
//     if (!toFormatted.startsWith("+")) {
//       if (/^[6-9]\d{9}$/.test(toFormatted)) toFormatted = "+91" + toFormatted;
//       else toFormatted = "+" + toFormatted;
//     }

//     console.log(`📤 Outbound call | from: ${fromNumber} → to: ${toFormatted}`);

//     const call = await twilioClient.calls.create({
//       from:                          fromNumber,
//       to:                            toFormatted,
//       url:                           `${process.env.BACKEND_URL}/api/call/outbound-twiml`,
//       statusCallback:                `${process.env.BACKEND_URL}/api/call/status`,
//       statusCallbackMethod:          "POST",
//       statusCallbackEvent:           ["initiated", "ringing", "answered", "completed"],
//       record:                        true,
//       recordingStatusCallback:       `${process.env.BACKEND_URL}/api/call/recording-callback`,
//       recordingStatusCallbackMethod: "POST",
//     });

//     // Save to DB immediately
//     const callRecord = await Call.create({
//       callSid:   call.sid,
//       from:      fromNumber,
//       to:        toFormatted,
//       direction: "outbound-api",
//       status:    call.status,
//       startTime: new Date(),
//     });

//     broadcast("call_outbound_initiated", {
//       callSid:   call.sid,
//       from:      fromNumber,
//       to:        toFormatted,
//       status:    call.status,
//       startTime: new Date(),
//     });

//     res.status(201).json({ success: true, callSid: call.sid, status: call.status, call: callRecord });
//   } catch (err) {
//     console.error("❌ Outbound call error:", err);
//     res.status(500).json({ error: err.message, twilioCode: err.code || null });
//   }
// };

// /* ═══════════════════════════════════════════════════════════════════════════════
//    5.  OUTBOUND TWIML  —  GET /api/call/outbound-twiml
//        Twilio fetches TwiML instructions for outbound calls.
//    ═══════════════════════════════════════════════════════════════════════════════ */
// export const outboundTwiml = (req, res) => {
//   const twiml = `<?xml version="1.0" encoding="UTF-8"?>
// <Response>
//   <Say voice="alice">Connecting your call. Please wait.</Say>
//   <Dial>
//     <Number>${req.query.to || ""}</Number>
//   </Dial>
// </Response>`;
//   res.set("Content-Type", "text/xml");
//   res.status(200).send(twiml);
// };

// /* ═══════════════════════════════════════════════════════════════════════════════
//    6.  GET ALL CALLS  —  GET /api/call/all
//    ═══════════════════════════════════════════════════════════════════════════════ */
// export const getAllCalls = async (req, res) => {
//   try {
//     const {
//       page      = 1,
//       limit     = 20,
//       status    = "",
//       direction = "",
//       search    = "",
//       from      = "",
//       to        = "",
//     } = req.query;

//     const query = {};
//     if (status)    query.status    = status;
//     if (direction) query.direction = direction;
//     if (from)      query.from      = { $regex: from, $options: "i" };
//     if (to)        query.to        = { $regex: to,   $options: "i" };
//     if (search) {
//       query.$or = [
//         { from:       { $regex: search, $options: "i" } },
//         { to:         { $regex: search, $options: "i" } },
//         { callerName: { $regex: search, $options: "i" } },
//         { callSid:    { $regex: search, $options: "i" } },
//       ];
//     }

//     const total = await Call.countDocuments(query);
//     const calls = await Call.find(query)
//       .sort({ createdAt: -1 })
//       .skip((parseInt(page) - 1) * parseInt(limit))
//       .limit(parseInt(limit))
//       .populate("handledBy", "firstName lastName email")
//       .lean();

//     res.json({
//       calls,
//       total,
//       page:       parseInt(page),
//       totalPages: Math.ceil(total / parseInt(limit)),
//     });
//   } catch (err) {
//     console.error("getAllCalls error:", err);
//     res.status(500).json({ error: err.message });
//   }
// };

// /* ═══════════════════════════════════════════════════════════════════════════════
//    7.  GET SINGLE CALL  —  GET /api/call/:id
//    ═══════════════════════════════════════════════════════════════════════════════ */
// export const getCallById = async (req, res) => {
//   try {
//     const call = await Call.findById(req.params.id).populate("handledBy", "firstName lastName email");
//     if (!call) return res.status(404).json({ error: "Call not found" });
//     res.json(call);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

// /* ═══════════════════════════════════════════════════════════════════════════════
//    8.  UPDATE CALL (add notes, link contact)  —  PATCH /api/call/:id
//    ═══════════════════════════════════════════════════════════════════════════════ */
// export const updateCall = async (req, res) => {
//   try {
//     const { notes, handledBy, crmContactId } = req.body;
//     const update = {};
//     if (notes        !== undefined) update.notes        = notes;
//     if (handledBy    !== undefined) update.handledBy    = handledBy;
//     if (crmContactId !== undefined) update.crmContactId = crmContactId;

//     const call = await Call.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
//     if (!call) return res.status(404).json({ error: "Call not found" });
//     res.json(call);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

// /* ═══════════════════════════════════════════════════════════════════════════════
//    9.  DELETE CALL  —  DELETE /api/call/:id
//    ═══════════════════════════════════════════════════════════════════════════════ */
// export const deleteCall = async (req, res) => {
//   try {
//     const deleted = await Call.findByIdAndDelete(req.params.id);
//     if (!deleted) return res.status(404).json({ error: "Call not found" });
//     res.json({ message: "Call log deleted successfully" });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

// /* ═══════════════════════════════════════════════════════════════════════════════
//    10. GET CALL STATS  —  GET /api/call/stats
//    ═══════════════════════════════════════════════════════════════════════════════ */
// export const getCallStats = async (req, res) => {
//   try {
//     const now          = new Date();
//     const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
//     const last7Days    = new Date(now - 7 * 24 * 60 * 60 * 1000);
//     const last30Days   = new Date(now - 30 * 24 * 60 * 60 * 1000);

//     const [total, today, week, month, byStatus, byDirection] = await Promise.all([
//       Call.countDocuments(),
//       Call.countDocuments({ createdAt: { $gte: startOfToday } }),
//       Call.countDocuments({ createdAt: { $gte: last7Days } }),
//       Call.countDocuments({ createdAt: { $gte: last30Days } }),
//       Call.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
//       Call.aggregate([{ $group: { _id: "$direction", count: { $sum: 1 } } }]),
//     ]);

//     res.json({ total, today, week, month, byStatus, byDirection });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };




// controllers/call.controller.js
import Call from "../models/Call.model.js";
import twilio from "twilio";
import dotenv from "dotenv";

// ✅ Import EXACTLY the same helpers your other controllers use
import {
  notifyUser,
  connectedUsers,
} from "../realtime/socket.js";

dotenv.config();

const accountSid    = process.env.TWILIO_ACCOUNT_SID;
const authToken     = process.env.TWILIO_AUTH_TOKEN;
const twilioClient  = twilio(accountSid, authToken);

// ─── Your Twilio voice number ─────────────────────────────────────────────────
const TWILIO_PHONE_NUMBER =
  process.env.TWILIO_PHONE_NUMBER ||
  process.env.TWILIO_WHATSAPP_FROM?.replace("whatsapp:", "") ||
  "";

// ─── Broadcast to ALL connected CRM users ────────────────────────────────────
// Uses the same pattern as whatsapp.controller.js
const broadcast = (event, payload) => {
  Object.keys(connectedUsers).forEach((uid) =>
    notifyUser(uid, event, payload)
  );
};

/* ═══════════════════════════════════════════════════════════════════════════════
   1.  INBOUND CALL WEBHOOK  —  POST /api/call/webhook
       ─────────────────────────────────────────────────
       ✅ Configure in Twilio Console:
         Phone Numbers → Manage → Active Numbers → +13049443661
         Voice & Fax → "A Call Comes In" → Webhook → POST
         URL: https://uenjoytours.cloud/api/call/webhook
   ═══════════════════════════════════════════════════════════════════════════════ */
export const inboundCallWebhook = async (req, res) => {
  try {
    const {
      CallSid,
      From,
      To,
      CallStatus,
      Direction,
      CallerName,
      AccountSid,
    } = req.body;

    console.log(
      `📞 Inbound call | SID: ${CallSid} | From: ${From} | Status: ${CallStatus}`
    );

    // ── Upsert call record into MongoDB ──────────────────────────────────────
    await Call.findOneAndUpdate(
      { callSid: CallSid },
      {
        callSid:    CallSid,
        from:       From       || "",
        to:         To         || "",
        status:     CallStatus || "ringing",
        direction:  Direction  || "inbound",
        callerName: CallerName || "",
        accountSid: AccountSid || "",
        startTime:  new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // ── Notify ALL connected CRM agents via socket ────────────────────────────
    // Same pattern: Object.keys(connectedUsers).forEach(uid => notifyUser(...))
    broadcast("call_incoming", {
      callSid:    CallSid,
      from:       From        || "",
      to:         To          || "",
      callerName: CallerName  || "",
      status:     CallStatus  || "ringing",
      direction:  Direction   || "inbound",
      startTime:  new Date(),
    });

    // ── TwiML Response (Twilio requires this) ─────────────────────────────────
    const backendUrl = process.env.BACKEND_URL || "https://uenjoytours.cloud";
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Thank you for calling. Please hold while we connect you.</Say>
  <Dial
    record="record-from-ringing"
    recordingStatusCallback="${backendUrl}/api/call/recording-callback"
    recordingStatusCallbackMethod="POST"
  >
    <Number>${TWILIO_PHONE_NUMBER}</Number>
  </Dial>
</Response>`;

    res.set("Content-Type", "text/xml");
    res.status(200).send(twiml);
  } catch (err) {
    console.error("❌ Inbound call webhook error:", err);
    res.set("Content-Type", "text/xml");
    res
      .status(200)
      .send(
        "<Response><Say>We are experiencing issues. Please try again later.</Say></Response>"
      );
  }
};

/* ═══════════════════════════════════════════════════════════════════════════════
   2.  CALL STATUS CALLBACK  —  POST /api/call/status
       ─────────────────────────────────────────────────
       ✅ Configure in Twilio Console:
         Same page → "Call Status Changes" → Webhook → POST
         URL: https://uenjoytours.cloud/api/call/status
   ═══════════════════════════════════════════════════════════════════════════════ */
export const callStatusCallback = async (req, res) => {
  try {
    const {
      CallSid,
      CallStatus,
      CallDuration,
      From,
      To,
      Direction,
      CallerName,
      AccountSid,
    } = req.body;

    console.log(
      `📞 Call status | SID: ${CallSid} | Status: ${CallStatus} | Duration: ${CallDuration || 0}s`
    );

    const updateFields = { status: CallStatus };
    if (CallDuration)  updateFields.duration  = parseInt(CallDuration, 10);
    if (CallerName)    updateFields.callerName = CallerName;
    if (CallStatus === "in-progress") updateFields.startTime = new Date();
    if (["completed", "busy", "no-answer", "failed", "canceled"].includes(CallStatus)) {
      updateFields.endTime = new Date();
    }

    // Upsert — handles cases where status arrives before inbound webhook
    const call = await Call.findOneAndUpdate(
      { callSid: CallSid },
      {
        $set:           updateFields,
        $setOnInsert: {
          from:       From       || "",
          to:         To         || "",
          direction:  Direction  || "inbound",
          accountSid: AccountSid || "",
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // ── Broadcast status change to all agents ─────────────────────────────────
    broadcast("call_status_update", {
      callSid:  CallSid,
      status:   CallStatus,
      duration: CallDuration ? parseInt(CallDuration, 10) : 0,
      from:     From || call.from,
      to:       To   || call.to,
    });

    res.status(200).send("OK");
  } catch (err) {
    console.error("❌ Call status callback error:", err);
    res.status(200).send("OK"); // Always 200 — stops Twilio retries
  }
};

/* ═══════════════════════════════════════════════════════════════════════════════
   3.  RECORDING CALLBACK  —  POST /api/call/recording-callback
       Twilio posts here when a recording is available.
   ═══════════════════════════════════════════════════════════════════════════════ */
export const recordingCallback = async (req, res) => {
  try {
    const {
      CallSid,
      RecordingSid,
      RecordingUrl,
      RecordingDuration,
      RecordingStatus,
    } = req.body;

    console.log(`🎙️  Recording | SID: ${CallSid} | Status: ${RecordingStatus}`);

    if (RecordingStatus === "completed" && RecordingUrl) {
      await Call.findOneAndUpdate(
        { callSid: CallSid },
        {
          $set: {
            recordingUrl:      RecordingUrl + ".mp3",
            recordingSid:      RecordingSid  || "",
            recordingDuration: parseInt(RecordingDuration, 10) || 0,
          },
        }
      );

      broadcast("call_recording_ready", {
        callSid:      CallSid,
        recordingUrl: RecordingUrl + ".mp3",
        recordingSid: RecordingSid,
      });
    }

    res.status(200).send("OK");
  } catch (err) {
    console.error("❌ Recording callback error:", err);
    res.status(200).send("OK");
  }
};

/* ═══════════════════════════════════════════════════════════════════════════════
   4.  MAKE OUTBOUND CALL  —  POST /api/call/outbound
   ═══════════════════════════════════════════════════════════════════════════════ */
export const makeOutboundCall = async (req, res) => {
  try {
    const { to, from } = req.body;
    if (!to) return res.status(400).json({ error: "to (phone number) is required" });

    const fromNumber = from || TWILIO_PHONE_NUMBER;
    if (!fromNumber)
      return res
        .status(500)
        .json({ error: "TWILIO_PHONE_NUMBER not configured in .env" });

    // Normalise number
    let toFormatted = to.trim().replace(/[\s\-().]/g, "");
    if (!toFormatted.startsWith("+")) {
      if (/^[6-9]\d{9}$/.test(toFormatted)) toFormatted = "+91" + toFormatted;
      else toFormatted = "+" + toFormatted;
    }

    console.log(`📤 Outbound call | from: ${fromNumber} → to: ${toFormatted}`);

    const backendUrl = process.env.BACKEND_URL || "https://uenjoytours.cloud";
    const call = await twilioClient.calls.create({
      from:                          fromNumber,
      to:                            toFormatted,
      url:                           `${backendUrl}/api/call/outbound-twiml`,
      statusCallback:                `${backendUrl}/api/call/status`,
      statusCallbackMethod:          "POST",
      statusCallbackEvent:           ["initiated", "ringing", "answered", "completed"],
      record:                        true,
      recordingStatusCallback:       `${backendUrl}/api/call/recording-callback`,
      recordingStatusCallbackMethod: "POST",
    });

    const callRecord = await Call.create({
      callSid:   call.sid,
      from:      fromNumber,
      to:        toFormatted,
      direction: "outbound-api",
      status:    call.status,
      startTime: new Date(),
    });

    broadcast("call_outbound_initiated", {
      callSid:   call.sid,
      from:      fromNumber,
      to:        toFormatted,
      status:    call.status,
      startTime: new Date(),
    });

    res.status(201).json({
      success: true,
      callSid: call.sid,
      status:  call.status,
      call:    callRecord,
    });
  } catch (err) {
    console.error("❌ Outbound call error:", err);
    res.status(500).json({ error: err.message, twilioCode: err.code || null });
  }
};

/* ═══════════════════════════════════════════════════════════════════════════════
   5.  OUTBOUND TWIML  —  GET /api/call/outbound-twiml
   ═══════════════════════════════════════════════════════════════════════════════ */
export const outboundTwiml = (req, res) => {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Connecting your call. Please wait.</Say>
  <Dial>
    <Number>${req.query.to || ""}</Number>
  </Dial>
</Response>`;
  res.set("Content-Type", "text/xml");
  res.status(200).send(twiml);
};

/* ═══════════════════════════════════════════════════════════════════════════════
   6.  GET ALL CALLS  —  GET /api/call/all
   ═══════════════════════════════════════════════════════════════════════════════ */
export const getAllCalls = async (req, res) => {
  try {
    const {
      page      = 1,
      limit     = 20,
      status    = "",
      direction = "",
      search    = "",
    } = req.query;

    const query = {};
    if (status)    query.status    = status;
    if (direction) query.direction = direction;
    if (search) {
      query.$or = [
        { from:       { $regex: search, $options: "i" } },
        { to:         { $regex: search, $options: "i" } },
        { callerName: { $regex: search, $options: "i" } },
        { callSid:    { $regex: search, $options: "i" } },
      ];
    }

    const total = await Call.countDocuments(query);
    const calls = await Call.find(query)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .populate("handledBy", "firstName lastName email")
      .lean();

    res.json({
      calls,
      total,
      page:       parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    console.error("getAllCalls error:", err);
    res.status(500).json({ error: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════════════════════
   7.  GET SINGLE CALL  —  GET /api/call/:id
   ═══════════════════════════════════════════════════════════════════════════════ */
export const getCallById = async (req, res) => {
  try {
    const call = await Call.findById(req.params.id).populate(
      "handledBy",
      "firstName lastName email"
    );
    if (!call) return res.status(404).json({ error: "Call not found" });
    res.json(call);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════════════════════
   8.  UPDATE CALL  —  PATCH /api/call/:id
   ═══════════════════════════════════════════════════════════════════════════════ */
export const updateCall = async (req, res) => {
  try {
    const { notes, handledBy, crmContactId } = req.body;
    const update = {};
    if (notes        !== undefined) update.notes        = notes;
    if (handledBy    !== undefined) update.handledBy    = handledBy;
    if (crmContactId !== undefined) update.crmContactId = crmContactId;

    const call = await Call.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true }
    );
    if (!call) return res.status(404).json({ error: "Call not found" });
    res.json(call);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════════════════════
   9.  DELETE CALL  —  DELETE /api/call/:id
   ═══════════════════════════════════════════════════════════════════════════════ */
export const deleteCall = async (req, res) => {
  try {
    const deleted = await Call.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Call not found" });
    res.json({ message: "Call log deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════════════════════
   10. CALL STATS  —  GET /api/call/stats
   ═══════════════════════════════════════════════════════════════════════════════ */
export const getCallStats = async (req, res) => {
  try {
    const now          = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const last7Days    = new Date(now - 7  * 24 * 60 * 60 * 1000);
    const last30Days   = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const [total, today, week, month, byStatus, byDirection] = await Promise.all([
      Call.countDocuments(),
      Call.countDocuments({ createdAt: { $gte: startOfToday } }),
      Call.countDocuments({ createdAt: { $gte: last7Days } }),
      Call.countDocuments({ createdAt: { $gte: last30Days } }),
      Call.aggregate([{ $group: { _id: "$status",    count: { $sum: 1 } } }]),
      Call.aggregate([{ $group: { _id: "$direction", count: { $sum: 1 } } }]),
    ]);

    res.json({ total, today, week, month, byStatus, byDirection });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};