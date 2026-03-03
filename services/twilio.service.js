import twilio from "twilio";
import dotenv from "dotenv";
dotenv.config();

// ─── Twilio Client ──────────────────────────────────────────────────────────
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken  = process.env.TWILIO_AUTH_TOKEN;

if (!accountSid || !authToken) {
  console.error("❌ TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN missing in .env");
  process.exit(1);
}

const client = twilio(accountSid, authToken);

// ─── Validate FROM number at startup ────────────────────────────────────────
const validateFromNumber = () => {
  const rawFrom = process.env.TWILIO_WHATSAPP_FROM;
  if (!rawFrom) {
    throw new Error(
      "TWILIO_WHATSAPP_FROM is not defined in .env. " +
      "It must be set to your Twilio WhatsApp sender, e.g. 'whatsapp:+14155238886' (sandbox) or 'whatsapp:+1234567890' (production)."
    );
  }

  // Clean the number
  let from = rawFrom.trim();
  if (from.startsWith("whatsapp:")) from = from.slice("whatsapp:".length);
  if (!from.startsWith("+")) from = "+" + from;
  const formattedFrom = `whatsapp:${from}`;

  // Known sandbox numbers (you can add more)
  const sandboxNumbers = ["+14155238886"];

  if (sandboxNumbers.includes(from)) {
    console.log(`✅ Using Twilio Sandbox number: ${formattedFrom}`);
  } else {
    // For production numbers, we could optionally check via API
    console.log(`📱 Using custom WhatsApp sender: ${formattedFrom}`);
    console.log(
      "⚠️  Ensure this number is WhatsApp-enabled in your Twilio Console."
    );
  }

  return formattedFrom;
};

let FROM;
try {
  FROM = validateFromNumber();
  console.log("📱 Twilio FROM (sender):", FROM);
} catch (err) {
  console.error("❌", err.message);
  process.exit(1);
}

// ─── Number normaliser ───────────────────────────────────────────────────────
export const normaliseWhatsappNumber = (raw = "") => {
  let num = raw.trim();
  if (num.startsWith("whatsapp:")) {
    num = num.slice("whatsapp:".length);
  }
  num = num.replace(/[\s\-().]/g, "");
  if (!num.startsWith("+")) {
    // 10-digit Indian mobile (starts with 6-9)
    if (/^[6-9]\d{9}$/.test(num)) {
      num = "+91" + num;
    } else {
      num = "+" + num;
    }
  }
  return `whatsapp:${num}`;
};

export const displayNumber = (num = "") => num.replace("whatsapp:", "");

// ─── Internal validator ───────────────────────────────────────────────────────
const validate = (to) => {
  if (!FROM) {
    throw new Error("WhatsApp sender (FROM) is not configured. Check TWILIO_WHATSAPP_FROM in .env");
  }
  if (!to) throw new Error("Recipient phone number is required");
};

// ─── Send plain text ──────────────────────────────────────────────────────────
export const sendTextMessage = async (to, body) => {
  const toFormatted = normaliseWhatsappNumber(to);
  validate(toFormatted);

  console.log(`📤 WhatsApp text | from: ${FROM} → to: ${toFormatted}`);

  try {
    const message = await client.messages.create({
      from: FROM,
      to:   toFormatted,
      body,
    });
    console.log(`✅ Sent | SID: ${message.sid} | status: ${message.status}`);
    return message;
  } catch (err) {
    err.twilioCode = err.code || null;
    throw err;
  }
};

// ─── Send template (Content SID) ─────────────────────────────────────────────
export const sendTemplateMessage = async (to, contentSid, variables = {}) => {
  const toFormatted = normaliseWhatsappNumber(to);
  validate(toFormatted);

  if (!contentSid) throw new Error("contentSid is required for template messages");

  console.log(`📤 WhatsApp template | to: ${toFormatted} | contentSid: ${contentSid}`);

  try {
    const message = await client.messages.create({
      from:             FROM,
      to:               toFormatted,
      contentSid,
      contentVariables: JSON.stringify(variables),
    });
    console.log(`✅ Template sent | SID: ${message.sid}`);
    return message;
  } catch (err) {
    err.twilioCode = err.code || null;
    throw err;
  }
};

// ─── Send media ───────────────────────────────────────────────────────────────
export const sendMediaMessage = async (to, body, mediaUrl) => {
  const toFormatted = normaliseWhatsappNumber(to);
  validate(toFormatted);

  console.log(`📤 WhatsApp media | to: ${toFormatted}`);

  try {
    const message = await client.messages.create({
      from:     FROM,
      to:       toFormatted,
      body:     body || "",
      mediaUrl: [mediaUrl],
    });
    console.log(`✅ Media sent | SID: ${message.sid}`);
    return message;
  } catch (err) {
    err.twilioCode = err.code || null;
    throw err;
  }
};

// ─── Fetch status ─────────────────────────────────────────────────────────────
export const fetchMessageStatus = async (messageSid) => {
  const msg = await client.messages(messageSid).fetch();
  return msg.status;
};

export default client;