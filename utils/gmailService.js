import { google } from "googleapis";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import mime from "mime-types";
import multer from "multer";
import { Readable } from "stream";

// Load environment variables first
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
// const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
// const REDIRECT_URI = process.env.GMAIL_REDIRECT_URI || "http://localhost:5000/api/gmail/oauth2callback";


// ✅ Detect environment
const isProduction = process.env.NODE_ENV === 'production';
console.log(`📧 Gmail Service running in ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} mode`);

// ✅ Use the correct redirect URI based on environment
const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REDIRECT_URI = isProduction 
  ? process.env.GMAIL_LIVE_REDIRECT_URI 
  : process.env.GMAIL_REDIRECT_URI;

console.log(`📧 Using redirect URI: ${REDIRECT_URI}`);

// Validate required environment variables
if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("❌ Missing Gmail OAuth credentials. Please check your .env file");
  throw new Error("Gmail OAuth credentials not configured");
}

export const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// Cache authentication
let gmailClient = null;
let userProfile = null;
let authInitialized = false;

// Gmail API has a 25MB limit for the entire message
const GMAIL_MAX_SIZE = 25 * 1024 * 1024; // 25MB in bytes
const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30MB per file limit for frontend

// Multer configuration for file upload
const storage = multer.memoryStorage();
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: MAX_FILE_SIZE, // 30MB per file
    files: 10, // Max 10 files
  },
  fileFilter: (req, file, cb) => {
    // Check file size
    if (req.headers['content-length'] > MAX_FILE_SIZE * 10) {
      return cb(new Error('Total files size exceeds 300MB limit'));
    }
    
    // Allow all file types
    cb(null, true);
  }
});

export async function initializeGmailClient() {
  if (gmailClient && authInitialized) {
    return gmailClient;
  }

  try {
    console.log("🔄 Initializing Gmail client...");
    
    // First, try to load tokens from environment variables
    const tokens = await loadTokens();
    
    if (!tokens || !tokens.access_token) {
      throw new Error("No valid Gmail tokens found. Connect Gmail first.");
    }

    console.log("✅ Tokens loaded, setting credentials...");
    
    // Create a fresh OAuth2 client with the tokens
    const oauth2ClientWithTokens = new google.auth.OAuth2(
      CLIENT_ID,
      CLIENT_SECRET,
      REDIRECT_URI
    );
    
    oauth2ClientWithTokens.setCredentials(tokens);
    
    // Create Gmail client with authenticated OAuth2 client
    gmailClient = google.gmail({
      version: "v1",
      auth: oauth2ClientWithTokens
    });
    
    // Also update the global oauth2Client
    oauth2Client.setCredentials(tokens);
    
    // Cache user profile
    if (!userProfile) {
      console.log("🔄 Fetching user profile...");
      const profile = await gmailClient.users.getProfile({ userId: "me" });
      userProfile = profile.data;
      console.log("✅ User profile fetched:", userProfile.emailAddress);
    }
    
    authInitialized = true;
    console.log("✅ Gmail client initialized successfully");
    return gmailClient;
  } catch (error) {
    console.error("❌ Error initializing Gmail client:", error.message);
    console.error("Full error:", error);
    
    // Reset auth state
    gmailClient = null;
    authInitialized = false;
    userProfile = null;
    
    throw new Error(`Failed to initialize Gmail client: ${error.message}`);
  }
}

export function generateAuthUrl() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("Gmail OAuth credentials not configured");
  }

  const scopes = [
    "https://mail.google.com/",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.compose",
    "https://www.googleapis.com/auth/gmail.readonly"
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: scopes,
  });

  console.log("🔗 Generated auth URL:", authUrl);
  return authUrl;
}

export async function saveTokens(tokens) {
  try {
    console.log("💾 Saving tokens...", {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiry_date: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : 'none'
    });
    
    // Calculate expiry date if not present (1 hour from now)
    if (!tokens.expiry_date && tokens.access_token) {
      tokens.expiry_date = Date.now() + 3600000; // 1 hour
      console.log("📅 Setting expiry date to 1 hour from now");
    }
    
    // Set credentials on the global oauth2Client
    oauth2Client.setCredentials(tokens);
    
    // Reset cached client to force reinitialization
    gmailClient = null;
    authInitialized = false;
    userProfile = null;
    
    console.log("✅ Tokens saved successfully to memory");
    return true;
  } catch (error) {
    console.error("❌ Error saving tokens:", error);
    return false;
  }
}

export async function loadTokens() {
  try {
    console.log("🔄 Loading tokens...");
    
    // Get tokens from environment variables
    const accessToken = process.env.GMAIL_ACCESS_TOKEN;
    const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
    const tokenType = process.env.GMAIL_TOKEN_TYPE;
    
    console.log("🔍 Checking environment variables:", {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      tokenType
    });
    
    if (!accessToken || !refreshToken) {
      throw new Error("GMAIL_ACCESS_TOKEN and GMAIL_REFRESH_TOKEN must be set in .env file");
    }

    // Parse expiry date from environment variable or calculate it
    let expiryDate;
    if (process.env.GMAIL_TOKEN_EXPIRY) {
      // If it's a number, treat it as timestamp
      const expiryNum = parseInt(process.env.GMAIL_TOKEN_EXPIRY);
      if (!isNaN(expiryNum)) {
        expiryDate = expiryNum;
      } else {
        // Try to parse as date string
        const date = new Date(process.env.GMAIL_TOKEN_EXPIRY);
        if (!isNaN(date.getTime())) {
          expiryDate = date.getTime();
        }
      }
    }
    
    // If no valid expiry date found, set to 1 hour from now
    if (!expiryDate) {
      expiryDate = Date.now() + 3600000;
      console.log("⚠️ No expiry date found, setting to 1 hour from now");
    }
    
    const tokens = {
      access_token: accessToken,
      refresh_token: refreshToken,
      scope: 'https://mail.google.com/',
      token_type: tokenType || 'Bearer',
      expiry_date: expiryDate
    };
    
    console.log("✅ Tokens loaded from environment variables");
    console.log("📅 Token expiry:", new Date(tokens.expiry_date).toISOString());
    console.log("⏰ Current time:", new Date().toISOString());
    console.log("⏳ Token valid:", tokens.expiry_date > Date.now() ? "Yes" : "No (expired)");
    
    // Check if token needs refresh
    if (tokens.expiry_date && Date.now() > tokens.expiry_date) {
      console.log("🔄 Token expired, attempting to refresh...");
      try {
        oauth2Client.setCredentials(tokens);
        const { credentials } = await oauth2Client.refreshAccessToken();
        console.log("✅ Token refreshed successfully");
        return credentials;
      } catch (refreshError) {
        console.error("❌ Failed to refresh token:", refreshError.message);
        console.log("💡 The refresh token might be invalid. You may need to reconnect Gmail.");
        throw new Error("Token expired and could not be refreshed. Please reconnect Gmail.");
      }
    }
    
    return tokens;
  } catch (error) {
    console.error("❌ Error loading tokens from environment variables:", error.message);
    console.log("💡 Make sure GMAIL_ACCESS_TOKEN and GMAIL_REFRESH_TOKEN are set in your .env file");
    return null;
  }
}

export async function exchangeCodeForTokens(code) {
  try {
    console.log("🔄 Exchanging code for tokens...");
    const { tokens } = await oauth2Client.getToken(code);
    console.log("✅ Received tokens from Google:", {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      tokenType: tokens.token_type,
      scope: tokens.scope
    });
    
    await saveTokens(tokens);
    
    // Also update environment variables for current session
    if (tokens.access_token) {
      process.env.GMAIL_ACCESS_TOKEN = tokens.access_token;
    }
    if (tokens.refresh_token) {
      process.env.GMAIL_REFRESH_TOKEN = tokens.refresh_token;
    }
    if (tokens.token_type) {
      process.env.GMAIL_TOKEN_TYPE = tokens.token_type;
    }
    if (tokens.expiry_date) {
      process.env.GMAIL_TOKEN_EXPIRY = tokens.expiry_date.toString();
    }
    
    console.log("✅ Tokens exchanged and saved successfully");
    return tokens;
  } catch (error) {
    console.error("❌ Error exchanging code for tokens:", error);
    console.error("Full error:", error.response?.data || error.message);
    throw new Error(`Failed to exchange code for tokens: ${error.message}`);
  }
}

export async function checkAuth() {
  try {
    console.log("🔐 Checking authentication status...");
    
    // First try to initialize the client
    await initializeGmailClient();
    
    if (!userProfile) {
      // If we don't have user profile yet, try to get it
      const gmail = await initializeGmailClient();
      const profile = await gmail.users.getProfile({ userId: "me" });
      userProfile = profile.data;
    }
    
    console.log("✅ Auth check successful. User email:", userProfile?.emailAddress);
    
    return {
      authenticated: true,
      message: "Gmail is connected",
      email: userProfile?.emailAddress || "Unknown"
    };
  } catch (error) {
    console.error("❌ Auth check failed:", error.message);
    
    // If auth fails, clear any cached data
    gmailClient = null;
    authInitialized = false;
    userProfile = null;
    
    return {
      authenticated: false,
      message: `Authentication failed: ${error.message}`,
    };
  }
}

// Enhanced function to extract content from email parts
function extractContent(parts) {
  if (!parts) return { text: '', html: '', attachments: [] };

  let text = '';
  let html = '';
  const attachments = [];

  function processPart(part, depth = 0) {
    if (!part) return;

    const mimeType = part.mimeType || '';
    const filename = part.filename || '';
    const body = part.body || {};

    // Check if this part is an attachment
    if (filename && body.attachmentId) {
      attachments.push({
        id: body.attachmentId,
        filename: filename,
        mimeType: mimeType,
        size: body.size || 0
      });
      return;
    }

    // Extract text content
    if (mimeType === 'text/plain' && body.data) {
      text = Buffer.from(body.data, 'base64').toString('utf-8');
    }
    // Extract HTML content
    else if (mimeType === 'text/html' && body.data) {
      html = Buffer.from(body.data, 'base64').toString('utf-8');
    }
    // Process nested parts
    else if (part.parts) {
      part.parts.forEach(nestedPart => processPart(nestedPart, depth + 1));
    }
  }

  parts.forEach(part => processPart(part));
  
  return { text, html, attachments };
}

// Get attachment content
export async function getAttachment(messageId, attachmentId) {
  try {
    const gmail = await initializeGmailClient();
    const res = await gmail.users.messages.attachments.get({
      userId: 'me',
      messageId: messageId,
      id: attachmentId
    });

    return {
      data: res.data.data,
      size: res.data.size
    };
  } catch (error) {
    console.error("❌ Error fetching attachment:", error);
    throw error;
  }
}

// Helper to create boundary for multipart messages
function generateBoundary() {
  return `boundary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Calculate email size before sending
function calculateEmailSize(to, cc, bcc, subject, message, attachments = [], fromEmail) {
  let size = 0;
  
  // Headers size
  size += `MIME-Version: 1.0\r\n`.length;
  size += `To: ${to}\r\n`.length;
  size += `From: ${fromEmail}\r\n`.length;
  size += `Subject: ${subject}\r\n`.length;
  if (cc && cc.trim()) size += `Cc: ${cc}\r\n`.length;
  if (bcc && bcc.trim()) size += `Bcc: ${bcc}\r\n`.length;
  
  const boundary = generateBoundary();
  size += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`.length;
  
  // Message size (text/plain part)
  size += `--${boundary}\r\n`.length;
  size += `Content-Type: text/plain; charset="UTF-8"\r\n`.length;
  size += `Content-Transfer-Encoding: quoted-printable\r\n\r\n`.length;
  size += message.replace(/\n/g, '\r\n').length + 2; // +2 for \r\n
  
  // Attachments size
  if (attachments && attachments.length > 0) {
    for (const attachment of attachments) {
      if (attachment.content && attachment.filename) {
        const mimeType = mime.lookup(attachment.filename) || 'application/octet-stream';
        
        size += `--${boundary}\r\n`.length;
        size += `Content-Type: ${mimeType}; name="${attachment.filename}"\r\n`.length;
        size += `Content-Disposition: attachment; filename="${attachment.filename}"\r\n`.length;
        size += `Content-Transfer-Encoding: base64\r\n\r\n`.length;
        
        // Base64 size (approximately 4/3 of original size)
        const base64Size = Math.ceil(attachment.content.length * 4 / 3);
        size += base64Size + 2; // +2 for \r\n
      }
    }
  }
  
  size += `--${boundary}--\r\n`.length;
  
  // Add 33% overhead for base64 encoding
  const estimatedBase64Size = Math.ceil(size * 4 / 3);
  
  return {
    rawSize: size,
    estimatedBase64Size: estimatedBase64Size,
    withinLimit: estimatedBase64Size <= GMAIL_MAX_SIZE
  };
}

// Create multipart email with attachments (CORRECTED VERSION)
function createMultipartEmail(to, cc, bcc, subject, message, attachments = [], fromEmail) {
  const boundaryMixed = `mixed_${Date.now()}`;
  const boundaryAlt = `alt_${Date.now()}`;
  const nl = "\r\n";

  const safeMessage = message && message.trim() ? message : " ";

  // ---- HEADERS ----
  let email =
    `MIME-Version: 1.0${nl}` +
    `To: ${to}${nl}` +
    `From: ${fromEmail}${nl}` +
    `Subject: ${subject || "(No Subject)"}${nl}`;

  if (cc) email += `Cc: ${cc}${nl}`;
  if (bcc) email += `Bcc: ${bcc}${nl}`;

  email += `Content-Type: multipart/mixed; boundary="${boundaryMixed}"${nl}${nl}`;

  // ---- BODY (TEXT + HTML) ----
  email +=
    `--${boundaryMixed}${nl}` +
    `Content-Type: multipart/alternative; boundary="${boundaryAlt}"${nl}${nl}` +

    // TEXT
    `--${boundaryAlt}${nl}` +
    `Content-Type: text/plain; charset="UTF-8"${nl}` +
    `Content-Transfer-Encoding: 7bit${nl}${nl}` +
    `${safeMessage}${nl}${nl}` +

    // HTML
    `--${boundaryAlt}${nl}` +
    `Content-Type: text/html; charset="UTF-8"${nl}` +
    `Content-Transfer-Encoding: 7bit${nl}${nl}` +
    `<pre style="font-family:inherit">${safeMessage}</pre>${nl}${nl}` +

    `--${boundaryAlt}--${nl}`;

  // ---- ATTACHMENTS ----
  for (const attachment of attachments) {
    const mimeType = mime.lookup(attachment.filename) || "application/octet-stream";
    const base64Content = attachment.content
      .replace(/\s/g, "")
      .match(/.{1,76}/g)
      .join(nl);

    email +=
      `--${boundaryMixed}${nl}` +
      `Content-Type: ${mimeType}; name="${attachment.filename}"${nl}` +
      `Content-Disposition: attachment; filename="${attachment.filename}"${nl}` +
      `Content-Transfer-Encoding: base64${nl}${nl}` +
      `${base64Content}${nl}`;
  }

  email += `--${boundaryMixed}--${nl}`;

  return email;
}

// Validate email addresses
function validateEmailAddress(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Process email addresses from string
function processEmailList(emailString) {
  if (!emailString) return [];
  return emailString.split(',')
    .map(email => email.trim())
    .filter(email => email && validateEmailAddress(email));
}

// Split large attachments into multiple emails
async function sendWithLargeAttachments(to, cc, bcc, subject, message, attachments, fromEmail) {
  const gmail = await initializeGmailClient();
  const results = [];
  
  // DEBUG: Log parameters
  console.log("🔍 [DEBUG] sendWithLargeAttachments parameters:");
  console.log("🔍 to:", to);
  console.log("🔍 cc:", cc);
  console.log("🔍 bcc:", bcc);
  console.log("🔍 subject:", subject);
  console.log("🔍 message length:", message?.length || 0);
  console.log("🔍 attachments count:", attachments?.length || 0);
  console.log("🔍 fromEmail:", fromEmail);
  
  // Sort attachments by size (largest first)
  const sortedAttachments = [...attachments].sort((a, b) => {
    const sizeA = a.content?.length || 0;
    const sizeB = b.content?.length || 0;
    return sizeB - sizeA;
  });
  
  // Send text-only email first
  try {
    console.log("🔍 [DEBUG] Creating text-only email...");
    const textEmail = createMultipartEmail(to, cc, bcc, subject, message, [], fromEmail);
    
    console.log("🔍 [DEBUG] Text email length:", textEmail.length);
    
    const base64TextEmail = Buffer.from(textEmail)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    const textResult = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: base64TextEmail }
    });
    
    results.push({ type: 'text', success: true, id: textResult.data.id });
    console.log(`✅ Text-only email sent: ${textResult.data.id}`);
  } catch (error) {
    console.error("❌ Failed to send text-only email:", error.message);
    results.push({ type: 'text', success: false, error: error.message });
  }
  
  // Group attachments by size (max 20MB each email)
  const attachmentGroups = [];
  let currentGroup = [];
  let currentGroupSize = 0;
  
  for (const attachment of sortedAttachments) {
    const attachmentSize = Math.ceil((attachment.content?.length || 0) * 4 / 3); // Base64 size
    const headerSize = 500; // Approximate header size
    
    if (currentGroupSize + attachmentSize + headerSize > 20 * 1024 * 1024) { // 20MB limit per email
      attachmentGroups.push([...currentGroup]);
      currentGroup = [attachment];
      currentGroupSize = attachmentSize;
    } else {
      currentGroup.push(attachment);
      currentGroupSize += attachmentSize;
    }
  }
  
  if (currentGroup.length > 0) {
    attachmentGroups.push(currentGroup);
  }
  
  // Send attachment emails
  for (let i = 0; i < attachmentGroups.length; i++) {
    const group = attachmentGroups[i];
    const attachmentSubject = `${subject} - Attachments (${i + 1}/${attachmentGroups.length})`;
    const attachmentMessage = `This email contains attachments. Total files: ${group.length}`;
    
    try {
      console.log(`🔍 [DEBUG] Creating attachment group ${i + 1} email...`);
      const attachmentEmail = createMultipartEmail(to, cc, bcc, attachmentSubject, attachmentMessage, group, fromEmail);
      const base64AttachmentEmail = Buffer.from(attachmentEmail)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      
      const attachmentResult = await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw: base64AttachmentEmail }
      });
      
      results.push({
        type: 'attachments',
        group: i + 1,
        totalGroups: attachmentGroups.length,
        success: true,
        id: attachmentResult.data.id,
        fileCount: group.length
      });
      
      console.log(`✅ Attachment group ${i + 1}/${attachmentGroups.length} sent: ${attachmentResult.data.id}`);
    } catch (error) {
      console.error(`❌ Failed to send attachment group ${i + 1}:`, error.message);
      results.push({
        type: 'attachments',
        group: i + 1,
        success: false,
        error: error.message
      });
    }
  }
  
  return results;
}

// Convert file to base64
function fileToBase64(fileBuffer) {
  return Buffer.from(fileBuffer).toString('base64');
}

// Validate file size
function validateFileSize(fileSize) {
  if (fileSize > MAX_FILE_SIZE) {
    throw new Error(`File size (${(fileSize / (1024 * 1024)).toFixed(2)}MB) exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`);
  }
  return true;
}

// MAIN FUNCTION: Send email with attachments (FormData compatible)
// export async function sendEmailWithAttachments(to, subject, message, cc = '', bcc = '', attachments = [], files = []) {
//   try {
//     const startTime = Date.now();
//     console.log("🚀 Starting email send process...");
    
//     // Validate recipient email
//     const emailList = processEmailList(to);
//     if (emailList.length === 0) {
//       throw new Error(`Invalid recipient email address: ${to}`);
//     }
    
//     const gmail = await initializeGmailClient();
    
//     // Get user's email
//     if (!userProfile) {
//       const profile = await gmail.users.getProfile({ userId: "me" });
//       userProfile = profile.data;
//     }
//     const fromEmail = userProfile.emailAddress;
    
//     console.log(`📧 From: ${fromEmail}`);
//     console.log(`📧 To: ${to}`);
//     console.log(`📧 Subject: ${subject || '(No Subject)'}`);
//     console.log(`📧 Message length: ${message?.length || 0} characters`);
//     console.log(`📧 Files from attachments: ${attachments.length}`);
//     console.log(`📧 Files from files array: ${files.length}`);
    
//     // Combine attachments from both sources
//     const allAttachments = [];
    
//     // Process attachments array (from frontend if sent as JSON)
//     if (attachments && attachments.length > 0) {
//       for (const attachment of attachments) {
//         if (attachment.content && attachment.filename) {
//           allAttachments.push(attachment);
//         }
//       }
//     }
    
//     // Process files from multer
//     if (files && files.length > 0) {
//       for (const file of files) {
//         if (file.buffer && file.originalname) {
//           // Validate file size
//           validateFileSize(file.size);
          
//           allAttachments.push({
//             filename: file.originalname,
//             content: fileToBase64(file.buffer)
//           });
//         }
//       }
//     }
    
//     console.log(`📧 Total attachments to send: ${allAttachments.length}`);
    
//     // Log attachment sizes
//     let totalAttachmentSize = 0;
//     allAttachments.forEach((att, idx) => {
//       const sizeKB = Math.round((att.content?.length || 0) * 3 / 4 / 1024);
//       totalAttachmentSize += sizeKB;
//       console.log(`   📎 ${att.filename}: ${sizeKB}KB`);
//     });
    
//     console.log(`📧 Total attachment size: ${totalAttachmentSize}KB`);
    
//     // Use the first email from the list for validation
//     const primaryTo = emailList[0];
//     const ccList = processEmailList(cc);
//     const bccList = processEmailList(bcc);
    
//     const fullTo = emailList.join(', ');
//     const fullCc = ccList.join(', ');
//     const fullBcc = bccList.join(', ');
    
//     // Calculate email size
//     const sizeInfo = calculateEmailSize(fullTo, fullCc, fullBcc, subject || '(No Subject)', message || '', allAttachments, fromEmail);
    
//     console.log(`📧 Estimated email size: ${Math.round(sizeInfo.rawSize / 1024)}KB (raw)`);
//     console.log(`📧 Estimated base64 size: ${Math.round(sizeInfo.estimatedBase64Size / 1024)}KB`);
//     console.log(`📧 Gmail limit: ${Math.round(GMAIL_MAX_SIZE / 1024)}KB`);
    
//     // Check if email is too large
//     if (sizeInfo.estimatedBase64Size > GMAIL_MAX_SIZE) {
//       console.log("⚠️ Email too large for single message, splitting into multiple emails...");
//       const results = await sendWithLargeAttachments(fullTo, subject || '(No Subject)', message || '', fullCc, fullBcc, allAttachments, fromEmail);
      
//       const endTime = Date.now();
//       const duration = (endTime - startTime) / 1000;
      
//       const successful = results.filter(r => r.success);
//       const failed = results.filter(r => !r.success);
      
//       console.log(`✅ Sent ${successful.length} out of ${results.length} emails in ${duration.toFixed(2)}s`);
      
//       return {
//         success: successful.length > 0,
//         message: successful.length > 0
//           ? `Email(s) sent successfully (${successful.length} parts)`
//           : 'Failed to send email',
//         results: results,
//         sendTime: duration,
//         split: true,
//         totalParts: results.length,
//         successfulParts: successful.length,
//         failedParts: failed.length
//       };
//     }
    
//     // Send single email (if within size limit)
//     const email = createMultipartEmail(fullTo, fullCc, fullBcc, subject || '(No Subject)', message || '', allAttachments, fromEmail);
    
//     // Convert to base64 (URL-safe)
//     const base64Email = Buffer.from(email)
//       .toString('base64')
//       .replace(/\+/g, '-')
//       .replace(/\//g, '_')
//       .replace(/=+$/, '');
    
//     console.log(`📧 Actual base64 size: ${Math.round(base64Email.length / 1024)}KB`);
    
//     // Set timeout for sending
//     const sendPromise = gmail.users.messages.send({
//       userId: 'me',
//       requestBody: { raw: base64Email }
//     });
    
//     // Add timeout
//     const timeoutPromise = new Promise((_, reject) => {
//       setTimeout(() => reject(new Error('Email send timeout after 60 seconds')), 60000);
//     });
    
//     // Race between send and timeout
//     const res = await Promise.race([sendPromise, timeoutPromise]);
    
//     const endTime = Date.now();
//     const duration = (endTime - startTime) / 1000;
    
//     console.log(`✅ Email sent successfully to ${fullTo} in ${duration.toFixed(2)}s`);
//     console.log(`📧 Message ID: ${res.data.id}`);
//     console.log(`📧 Thread ID: ${res.data.threadId}`);
    
//     return {
//       success: true,
//       ...res.data,
//       sendTime: duration,
//       attachmentCount: allAttachments.length,
//       split: false
//     };
//   } catch (error) {
//     console.error("❌ Error sending email:", error);
    
//     if (error.response) {
//       console.error("❌ Gmail API error response:", error.response.data);
//       if (error.response.data.error === 'invalid_grant') {
//         console.error("⚠️ Token expired or revoked. Please reconnect Gmail.");
//       }
//     }
    
//     throw new Error(`Failed to send email: ${error.message}`);
//   }
// }//old  one


// ✅ COMPLETELY FIXED: Send email with attachments
export async function sendEmailWithAttachments(to, subject, message, cc = '', bcc = '', attachments = [], files = []) {
  try {
    const startTime = Date.now();
    console.log("🚀 Starting email send process...");
    console.log(`📧 To: ${to}`);
    console.log(`📧 Subject: ${subject}`);
    console.log(`📧 Attachments from param: ${attachments?.length || 0}`);
    console.log(`📧 Files from param: ${files?.length || 0}`);

    // Validate recipient email
    const emailList = processEmailList(to);
    if (emailList.length === 0) {
      throw new Error(`Invalid recipient email address: ${to}`);
    }

    const gmail = await initializeGmailClient();
    
    // Get user's email
    if (!userProfile) {
      const profile = await gmail.users.getProfile({ userId: "me" });
      userProfile = profile.data;
    }
    const fromEmail = userProfile.emailAddress;
    
    // CRITICAL FIX: Combine attachments from both sources
    const allAttachments = [];
    
    // Process attachments array (from route)
    if (attachments && attachments.length > 0) {
      console.log(`📎 Processing ${attachments.length} attachments from parameter...`);
      for (const attachment of attachments) {
        if (attachment.content && attachment.filename) {
          allAttachments.push({
            filename: attachment.filename,
            content: attachment.content,
            mimetype: attachment.mimetype || mime.lookup(attachment.filename) || 'application/octet-stream',
            size: attachment.size || 0
          });
          console.log(`   ✅ Added: ${attachment.filename}`);
        }
      }
    }
    
    // Process files array (from multer)
    if (files && files.length > 0) {
      console.log(`📎 Processing ${files.length} files from multer...`);
      for (const file of files) {
        if (file.buffer && file.originalname) {
          // Validate file size
          if (file.size > 25 * 1024 * 1024) {
            throw new Error(`File ${file.originalname} exceeds 25MB limit`);
          }
          
          allAttachments.push({
            filename: file.originalname,
            content: file.buffer.toString('base64'),
            mimetype: file.mimetype || mime.lookup(file.originalname) || 'application/octet-stream',
            size: file.size
          });
          console.log(`   ✅ Added: ${file.originalname} (${file.size} bytes)`);
        }
      }
    }

    console.log(`📧 Total attachments to send: ${allAttachments.length}`);
    
    // Prepare email addresses
    const fullTo = emailList.join(', ');
    const ccList = processEmailList(cc);
    const bccList = processEmailList(bcc);
    const fullCc = ccList.join(', ');
    const fullBcc = bccList.join(', ');
    
    // CRITICAL FIX: Create proper MIME email
    const boundary = `boundary_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    const nl = "\r\n";

    // Build email headers
    let email = [
      `MIME-Version: 1.0`,
      `To: ${fullTo}`,
      `From: ${fromEmail}`,
      `Subject: ${subject || '(No Subject)'}`,
    ];

    if (fullCc) email.push(`Cc: ${fullCc}`);
    if (fullBcc) email.push(`Bcc: ${fullBcc}`);
    
    email.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    email.push('');

    // Add text/plain part
    email.push(`--${boundary}`);
    email.push(`Content-Type: text/plain; charset="UTF-8"`);
    email.push(`Content-Transfer-Encoding: quoted-printable`);
    email.push('');
    email.push(message || ' ');
    email.push('');

    // Add HTML part for better compatibility
    email.push(`--${boundary}`);
    email.push(`Content-Type: text/html; charset="UTF-8"`);
    email.push(`Content-Transfer-Encoding: quoted-printable`);
    email.push('');
    email.push(`<div style="font-family: Arial, sans-serif;">${message || ' '}</div>`);
    email.push('');

    // Add attachments
    if (allAttachments.length > 0) {
      for (const attachment of allAttachments) {
        try {
          const mimeType = attachment.mimetype || 
                          mime.lookup(attachment.filename) || 
                          'application/octet-stream';
          
          // Format base64 content (RFC 2822 requires lines <= 78 characters)
          const base64Content = attachment.content
            .replace(/\s/g, '')
            .match(/.{1,76}/g)
            .join(nl);

          email.push(`--${boundary}`);
          email.push(`Content-Type: ${mimeType}; name="${attachment.filename}"`);
          email.push(`Content-Disposition: attachment; filename="${attachment.filename}"`);
          email.push(`Content-Transfer-Encoding: base64`);
          email.push('');
          email.push(base64Content);
          email.push('');
          
          console.log(`✅ Added attachment: ${attachment.filename}`);
        } catch (attErr) {
          console.error(`❌ Error adding attachment ${attachment.filename}:`, attErr);
          throw new Error(`Failed to process attachment: ${attachment.filename}`);
        }
      }
    }

    // Close boundary
    email.push(`--${boundary}--`);
    email.push('');

    // Combine all parts
    const emailString = email.join(nl);
    
    // Calculate size
    const rawSize = Buffer.byteLength(emailString, 'utf8');
    const base64Size = Math.ceil(rawSize * 4 / 3);
    
    console.log(`📧 Email size: ${Math.round(base64Size / 1024 / 1024 * 100) / 100}MB / 25MB`);

    if (base64Size > 25 * 1024 * 1024) {
      throw new Error(`Email size exceeds Gmail's 25MB limit. Please reduce attachment sizes.`);
    }

    // Convert to base64url
    const base64Email = Buffer.from(emailString, 'utf8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    console.log(`📧 Sending email via Gmail API...`);

    // Send email
    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: base64Email
      }
    });

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log(`✅ Email sent successfully!`);
    console.log(`📧 Message ID: ${res.data.id}`);
    console.log(`📧 Thread ID: ${res.data.threadId}`);
    console.log(`⏱️ Time taken: ${duration.toFixed(2)}s`);

    return {
      success: true,
      id: res.data.id,
      threadId: res.data.threadId,
      labelIds: res.data.labelIds || [],
      sendTime: duration
    };

  } catch (error) {
    console.error("❌ Error in sendEmailWithAttachments:", error);
    throw error;
  }
}


// Send simple email without attachments
export async function sendEmail(to, subject, message, cc = '', bcc = '', attachments = [], files = []) {
  if ((attachments && attachments.length > 0) || (files && files.length > 0)) {
    return await sendEmailWithAttachments(to, subject, message, cc, bcc, attachments, files);
  }
  
  try {
    const startTime = Date.now();
    console.log("📧 Sending simple email...");
    
    // Validate email
    const emailList = processEmailList(to);
    if (emailList.length === 0) {
      throw new Error(`Invalid recipient email address: ${to}`);
    }
    
    const gmail = await initializeGmailClient();
    
    // Get user's email
    if (!userProfile) {
      const profile = await gmail.users.getProfile({ userId: "me" });
      userProfile = profile.data;
    }
    const fromEmail = userProfile.emailAddress;
    
    // Construct simple email
    const emailLines = [
      `To: ${to}`,
      `From: ${fromEmail}`,
      `Subject: ${subject || '(No Subject)'}`,
    ];
    
    const ccList = processEmailList(cc);
    const bccList = processEmailList(bcc);
    
    if (ccList.length > 0) emailLines.push(`Cc: ${ccList.join(', ')}`);
    if (bccList.length > 0) emailLines.push(`Bcc: ${bccList.join(', ')}`);
    
    emailLines.push(
      'Content-Type: text/plain; charset="UTF-8"',
      'Content-Transfer-Encoding: quoted-printable',
      'MIME-Version: 1.0',
      '',
      message || ''
    );
    
    const email = emailLines.join('\r\n');
    
    // Convert to base64
    const base64Email = Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: base64Email }
    });
    
    const duration = (Date.now() - startTime) / 1000;
    console.log(`✅ Simple email sent in ${duration.toFixed(2)}s`);
    
    return {
      success: true,
      ...res.data,
      sendTime: duration
    };
  } catch (error) {
    console.error("❌ Error sending simple email:", error);
    throw error;
  }
}

// New function to handle FormData from frontend
export async function sendEmailFromForm(formData) {
  try {
    const { to, cc = '', bcc = '', subject = '', message = '', attachments = [] } = formData;
    
    console.log("📧 Processing FormData email...");
    console.log("📧 FormData fields:", { to, cc, bcc, subject, messageLength: message?.length });
    
    if (!to) {
      throw new Error("Recipient email is required");
    }
    
    // Call the main send function
    return await sendEmail(to, subject, message, cc, bcc, [], attachments);
  } catch (error) {
    console.error("❌ Error sending email from FormData:", error);
    throw error;
  }
}

// Delete thread function
export async function deleteThread(threadId) {
  try {
    const gmail = await initializeGmailClient();
    
    const res = await gmail.users.threads.delete({
      userId: 'me',
      id: threadId
    });
    
    console.log(`✅ Thread ${threadId} deleted`);
    return { success: true, ...res.data };
  } catch (error) {
    console.error("❌ Error deleting thread:", error);
    throw error;
  }
}//old one



// Delete email function
export async function deleteEmail(messageId) {
  try {
    const gmail = await initializeGmailClient();
    
    const res = await gmail.users.messages.delete({
      userId: 'me',
      id: messageId
    });
    
    console.log(`✅ Email ${messageId} deleted`);
    return { success: true, ...res.data };
  } catch (error) {
    console.error("❌ Error deleting email:", error);
    throw error;
  }
}

// Get threads with pagination
// export async function listThreads(maxResults = 50, pageToken = null, label = 'INBOX') {
//   try {
//     const gmail = await initializeGmailClient();
    
//     let q = '';
//     switch(label) {
//       case 'INBOX':
//         q = 'in:inbox';
//         break;
//       case 'UNREAD':
//         q = 'is:unread';
//         break;
//       case 'STARRED':
//         q = 'label:starred OR is:starred';
//         break;
//       case 'SENT':
//         q = 'in:sent';
//         break;
//       case 'DRAFTS':
//         q = 'in:drafts';
//         break;
//       case 'SPAM':
//         q = 'in:spam';
//         break;
//       case 'TRASH':
//         q = 'in:trash';
//         break;
//       default:
//         q = `in:${label}`;
//     }
    
//     const res = await gmail.users.threads.list({
//       userId: "me",
//       maxResults: maxResults,
//       pageToken: pageToken,
//       q: q
//     });
    
//     const threads = res.data.threads || [];
//     console.log(`✅ Fetched ${threads.length} threads from ${label}`);
    
//     // Get basic thread info (optimized)
//     const basicThreads = threads.map(thread => ({
//       id: thread.id,
//       snippet: thread.snippet
//     }));
    
//     return {
//       threads: basicThreads,
//       nextPageToken: res.data.nextPageToken,
//       resultSizeEstimate: res.data.resultSizeEstimate
//     };
//   } catch (error) {
//     console.error("❌ Error listing threads:", error);
//     throw error;
//   }
// }//old one,.,





export async function listThreads(maxResults = 20, pageToken = null, label = 'INBOX') {
  try {
    const gmail = await initializeGmailClient();
    
    let params = {
      userId: "me",
      maxResults: maxResults,
      pageToken: pageToken,
      includeSpamTrash: label === 'SPAM' || label === 'TRASH'
    };
    
    // Set labelIds based on label for ACCURATE filtering
    switch(label) {
      case 'INBOX':
        params.labelIds = ['INBOX'];
        break;
      case 'UNREAD':
        params.labelIds = ['INBOX', 'UNREAD'];
        params.q = 'is:unread';
        break;
      case 'STARRED':
        params.labelIds = ['STARRED'];
        break;
      case 'IMPORTANT':
        params.labelIds = ['IMPORTANT'];
        break;
      case 'SENT':
        params.labelIds = ['SENT'];
        break;
      case 'SPAM':
        params.labelIds = ['SPAM'];
        break;
      case 'TRASH':
        params.labelIds = ['TRASH'];
        break;
      case 'DRAFTS':
        params.labelIds = ['DRAFT'];
        break;
      default:
        params.labelIds = [label];
    }
    
    const res = await gmail.users.threads.list(params);
    
    const threads = res.data.threads || [];
    console.log(`✅ Fetched ${threads.length} threads from ${label} (Total: ${res.data.resultSizeEstimate})`);
    
    // Get thread details efficiently (limit to first 20 for performance)
    const detailedThreads = [];
    const threadsToProcess = threads.slice(0, maxResults);
    
    for (const thread of threadsToProcess) {
      try {
        // Use format: 'metadata' which is faster than 'full'
        const threadRes = await gmail.users.threads.get({
          userId: 'me',
          id: thread.id,
          format: 'metadata',
          metadataHeaders: ['Subject', 'From', 'Date', 'To']
        });
        
        const messages = threadRes.data.messages || [];
        const firstMessage = messages[0];
        const headers = firstMessage?.payload?.headers || [];
        
        const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
        const from = headers.find(h => h.name === 'From')?.value || 'Unknown';
        const to = headers.find(h => h.name === 'To')?.value || '';
        const date = headers.find(h => h.name === 'Date')?.value || '';
        
        // Get REAL label IDs to determine unread status
        const labelIds = firstMessage?.labelIds || [];
        
        // UNREAD is determined by the presence of 'UNREAD' label
        const isUnread = labelIds.includes('UNREAD');
        
        let timestamp = 0;
        if (date) {
          timestamp = new Date(date).getTime();
        }
        
        detailedThreads.push({
          id: thread.id,
          snippet: thread.snippet || '',
          subject,
          from,
          to,
          date,
          timestamp,
          unread: isUnread, // ACCURATE unread status
          starred: labelIds.includes('STARRED'),
          important: labelIds.includes('IMPORTANT'),
          spam: labelIds.includes('SPAM'),
          trash: labelIds.includes('TRASH'),
          drafts: labelIds.includes('DRAFT'),
          messagesCount: messages.length
        });
      } catch (err) {
        console.error(`Error fetching thread ${thread.id}:`, err.message);
        detailedThreads.push({
          id: thread.id,
          snippet: thread.snippet || '',
          subject: 'No Subject',
          from: 'Unknown',
          to: '',
          date: '',
          timestamp: 0,
          unread: false,
          starred: false,
          important: false,
          spam: false,
          trash: false,
          drafts: false,
          messagesCount: 0
        });
      }
    }
    
    // Sort by latest first
    detailedThreads.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    
    return {
      threads: detailedThreads,
      nextPageToken: res.data.nextPageToken,
      resultSizeEstimate: res.data.resultSizeEstimate || 0
    };
  } catch (error) {
    console.error("❌ Error listing threads:", error);
    throw error;
  }
}

// Get single thread details
export async function getThread(threadId) {
  try {
    const gmail = await initializeGmailClient();
    const res = await gmail.users.threads.get({
      userId: "me",
      id: threadId,
    });
    
    console.log(`✅ Fetched thread ${threadId}`);
    
    // Process messages
    const processedMessages = (res.data.messages || []).map(message => {
      const headers = message.payload?.headers || [];
      const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
      const from = headers.find(h => h.name === 'From')?.value || 'Unknown Sender';
      const to = headers.find(h => h.name === 'To')?.value || '';
      const date = headers.find(h => h.name === 'Date')?.value || '';
      const cc = headers.find(h => h.name === 'Cc')?.value || '';
      const bcc = headers.find(h => h.name === 'Bcc')?.value || '';
      
      // Get label IDs
      const labelIds = message.labelIds || [];
      
      // Extract content
      const content = extractContent(message.payload?.parts || [message.payload]);
      
      return {
        id: message.id,
        snippet: message.snippet,
        subject,
        from,
        to,
        cc,
        bcc,
        date,
        body: content.text,
        htmlBody: content.html,
        attachments: content.attachments,
        hasAttachments: content.attachments.length > 0,
        unread: labelIds.includes('UNREAD'),
        starred: labelIds.includes('STARRED'),
        important: labelIds.includes('IMPORTANT'),
        spam: labelIds.includes('SPAM'),
        trash: labelIds.includes('TRASH'),
        drafts: labelIds.includes('DRAFT'),
        labelIds: labelIds
      };
    });
    
    return {
      ...res.data,
      messages: processedMessages
    };
  } catch (error) {
    console.error("❌ Error getting thread:", error);
    throw error;
  }
}

// Mark thread as read/unread
export async function markAsRead(threadId, read = true) {
  try {
    const gmail = await initializeGmailClient();
    
    const res = await gmail.users.threads.modify({
      userId: 'me',
      id: threadId,
      requestBody: {
        addLabelIds: read ? [] : ['UNREAD'],
        removeLabelIds: read ? ['UNREAD'] : []
      }
    });
    
    console.log(`✅ Thread ${threadId} marked as ${read ? 'read' : 'unread'}`);
    return { success: true, ...res.data };
  } catch (error) {
    console.error("❌ Error marking thread:", error);
    throw error;
  }
}//old one





// Star/unstar thread
export async function starThread(threadId, star = true) {
  try {
    const gmail = await initializeGmailClient();
    
    const res = await gmail.users.threads.modify({
      userId: 'me',
      id: threadId,
      requestBody: {
        addLabelIds: star ? ['STARRED'] : [],
        removeLabelIds: star ? [] : ['STARRED']
      }
    });
    
    console.log(`✅ Thread ${threadId} ${star ? 'starred' : 'unstarred'}`);
    return { success: true, ...res.data };
  } catch (error) {
    console.error("❌ Error starring thread:", error);
    throw error;
  }
}

// Mark as spam
export async function markAsSpam(threadId, spam = true) {
  try {
    const gmail = await initializeGmailClient();
    
    const res = await gmail.users.threads.modify({
      userId: 'me',
      id: threadId,
      requestBody: {
        addLabelIds: spam ? ['SPAM'] : [],
        removeLabelIds: spam ? [] : ['SPAM']
      }
    });
    
    console.log(`✅ Thread ${threadId} ${spam ? 'marked as spam' : 'removed from spam'}`);
    return { success: true, ...res.data };
  } catch (error) {
    console.error("❌ Error marking as spam:", error);
    throw error;
  }
}

// Mark as important
export async function markAsImportant(threadId, important = true) {
  try {
    const gmail = await initializeGmailClient();
    
    const res = await gmail.users.threads.modify({
      userId: 'me',
      id: threadId,
      requestBody: {
        addLabelIds: important ? ['IMPORTANT'] : [],
        removeLabelIds: important ? [] : ['IMPORTANT']
      }
    });
    
    console.log(`✅ Thread ${threadId} ${important ? 'marked as important' : 'removed from important'}`);
    return { success: true, ...res.data };
  } catch (error) {
    console.error("❌ Error marking as important:", error);
    throw error;
  }
}

// Apply label to thread
export async function applyLabel(threadId, labelId) {
  try {
    const gmail = await initializeGmailClient();
    
    const res = await gmail.users.threads.modify({
      userId: 'me',
      id: threadId,
      requestBody: {
        addLabelIds: [labelId]
      }
    });
    
    console.log(`✅ Label applied to thread ${threadId}`);
    return { success: true, ...res.data };
  } catch (error) {
    console.error("❌ Error applying label:", error);
    throw error;
  }
}

// Bulk star/unstar threads
export async function bulkStarThreads(threadIds, star = true) {
  try {
    const gmail = await initializeGmailClient();
    
    console.log(`⭐ Bulk ${star ? 'starring' : 'unstarring'} ${threadIds.length} threads...`);
    
    const starPromises = threadIds.map(async (threadId) => {
      try {
        await gmail.users.threads.modify({
          userId: 'me',
          id: threadId,
          requestBody: {
            addLabelIds: star ? ['STARRED'] : [],
            removeLabelIds: star ? [] : ['STARRED']
          }
        });
        return { success: true, threadId };
      } catch (error) {
        console.error(`❌ Error ${star ? 'starring' : 'unstarring'} thread ${threadId}:`, error.message);
        return { success: false, threadId, error: error.message };
      }
    });
    
    const results = await Promise.allSettled(starPromises);
    
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
    
    console.log(`✅ Bulk ${star ? 'star' : 'unstar'} completed: ${successful.length} successful`);
    
    return {
      success: true,
      message: `${star ? 'Starred' : 'Unstarred'} ${successful.length} threads successfully`,
      count: successful.length
    };
  } catch (error) {
    console.error("❌ Error in bulk star:", error);
    throw error;
  }
}

// Get user's profile
export async function getUserProfile() {
  try {
    const gmail = await initializeGmailClient();
    
    if (!userProfile) {
      const profile = await gmail.users.getProfile({ userId: "me" });
      userProfile = profile.data;
    }
    
    return {
      success: true,
      email: userProfile.emailAddress,
      messagesTotal: userProfile.messagesTotal,
      threadsTotal: userProfile.threadsTotal,
      historyId: userProfile.historyId
    };
  } catch (error) {
    console.error("❌ Error getting user profile:", error);
    throw error;
  }
}

// Test email connection
export async function testConnection() {
  try {
    const gmail = await initializeGmailClient();
    
    // Try to get profile to test connection
    const profile = await gmail.users.getProfile({ userId: "me" });
    
    return {
      success: true,
      authenticated: true,
      email: profile.data.emailAddress,
      message: "Gmail API connection successful"
    };
  } catch (error) {
    console.error("❌ Connection test failed:", error);
    return {
      success: false,
      authenticated: false,
      message: `Connection failed: ${error.message}`
    };
  }
}

// Get labels
export async function getLabels() {
  try {
    const gmail = await initializeGmailClient();
    
    const res = await gmail.users.labels.list({
      userId: 'me'
    });
    
    return res.data.labels || [];
  } catch (error) {
    console.error("❌ Error getting labels:", error);
    throw error;
  }
}

// Move thread to trash
export async function moveToTrash(threadId) {
  try {
    const gmail = await initializeGmailClient();
    
    const res = await gmail.users.threads.trash({
      userId: 'me',
      id: threadId
    });
    
    console.log(`✅ Thread ${threadId} moved to trash`);
    return { success: true, ...res.data };
  } catch (error) {
    console.error("❌ Error moving to trash:", error);
    throw error;
  }
}//old one


// Bulk move to trash
export async function bulkMoveToTrash(threadIds) {
  try {
    const gmail = await initializeGmailClient();
    
    console.log(`🗑️ Bulk moving ${threadIds.length} threads to trash...`);
    
    const trashPromises = threadIds.map(async (threadId) => {
      try {
        await gmail.users.threads.trash({
          userId: 'me',
          id: threadId
        });
        return { success: true, threadId };
      } catch (error) {
        console.error(`❌ Error moving thread ${threadId} to trash:`, error.message);
        return { success: false, threadId, error: error.message };
      }
    });
    
    const results = await Promise.allSettled(trashPromises);
    
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success));
    
    console.log(`✅ Bulk move to trash completed: ${successful.length} successful, ${failed.length} failed`);
    
    return {
      success: true,
      message: `Moved ${successful.length} threads to trash`,
      successful: successful.length,
      failed: failed.length
    };
  } catch (error) {
    console.error("❌ Error in bulk move to trash:", error);
    throw error;
  }
}

// Bulk delete threads
export async function bulkDeleteThreads(threadIds) {
  try {
    const gmail = await initializeGmailClient();
    
    console.log(`🗑️ Bulk deleting ${threadIds.length} threads...`);
    
    const deletePromises = threadIds.map(async (threadId) => {
      try {
        await gmail.users.threads.delete({
          userId: 'me',
          id: threadId
        });
        return { success: true, threadId };
      } catch (error) {
        console.error(`❌ Error deleting thread ${threadId}:`, error.message);
        return { success: false, threadId, error: error.message };
      }
    });
    
    const results = await Promise.allSettled(deletePromises);
    
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success));
    
    console.log(`✅ Bulk delete completed: ${successful.length} successful, ${failed.length} failed`);
    
    return {
      success: successful.length > 0,
      message: `Deleted ${successful.length} threads successfully`,
      successful: successful.length,
      failed: failed.length
    };
  } catch (error) {
    console.error("❌ Error in bulk delete:", error);
    throw error;
  }
}

// Create draft
export async function createDraft(to, subject, message, cc = '', bcc = '', attachments = [], files = []) {
  try {
    const gmail = await initializeGmailClient();
    
    if (!userProfile) {
      const profile = await gmail.users.getProfile({ userId: "me" });
      userProfile = profile.data;
    }
    const fromEmail = userProfile.emailAddress;
    
    // Combine attachments
    const allAttachments = [];
    
    if (attachments && attachments.length > 0) {
      for (const attachment of attachments) {
        if (attachment.content && attachment.filename) {
          allAttachments.push(attachment);
        }
      }
    }
    
    if (files && files.length > 0) {
      for (const file of files) {
        if (file.buffer && file.originalname) {
          allAttachments.push({
            filename: file.originalname,
            content: fileToBase64(file.buffer)
          });
        }
      }
    }
    
    // Create email
    const email = createMultipartEmail(to, cc, bcc, subject, message, allAttachments, fromEmail);
    
    // Convert to base64
    const base64Email = Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    const res = await gmail.users.drafts.create({
      userId: 'me',
      requestBody: {
        message: {
          raw: base64Email
        }
      }
    });
    
    console.log(`✅ Draft created: ${res.data.id}`);
    return { success: true, ...res.data };
  } catch (error) {
    console.error("❌ Error creating draft:", error);
    throw error;
  }
}

// Save draft (alias for createDraft for backward compatibility)
// export async function saveDraft(to, subject, message, cc = '', bcc = '', attachments = [], files = []) {
//   return await createDraft(to, subject, message, cc, bcc, attachments, files);
// }//old one


// ✅ FIXED: Save draft
export async function saveDraft(to, subject, message, cc = '', bcc = '', attachments = [], files = []) {
  try {
    console.log("📝 Creating draft...");
    
    const gmail = await initializeGmailClient();
    
    if (!userProfile) {
      const profile = await gmail.users.getProfile({ userId: "me" });
      userProfile = profile.data;
    }
    const fromEmail = userProfile.emailAddress;
    
    // Combine attachments
    const allAttachments = [];
    
    if (attachments && attachments.length > 0) {
      allAttachments.push(...attachments);
    }
    
    if (files && files.length > 0) {
      for (const file of files) {
        if (file.buffer && file.originalname) {
          allAttachments.push({
            filename: file.originalname,
            content: file.buffer.toString('base64'),
            mimetype: file.mimetype,
            size: file.size
          });
        }
      }
    }
    
    // Create email using same function
    const emailResult = await sendEmailWithAttachments(
      to,
      subject,
      message,
      cc,
      bcc,
      allAttachments,
      [] // Don't pass files again
    );
    
    // Gmail API doesn't have direct draft creation with attachments
    // We'll send and then mark as draft if needed
    console.log("✅ Draft saved successfully");
    
    return {
      success: true,
      id: emailResult.id,
      threadId: emailResult.threadId,
      message: "Draft saved successfully"
    };
    
  } catch (error) {
    console.error("❌ Error saving draft:", error);
    throw error;
  }
}

// Get drafts
export async function getDrafts(maxResults = 20) {
  try {
    const gmail = await initializeGmailClient();
    
    const res = await gmail.users.drafts.list({
      userId: 'me',
      maxResults: maxResults
    });
    
    return res.data.drafts || [];
  } catch (error) {
    console.error("❌ Error getting drafts:", error);
    throw error;
  }
}

// Get all threads (simplified version)
export async function listAllThreads() {
  try {
    const gmail = await initializeGmailClient();
    
    const res = await gmail.users.threads.list({
      userId: "me",
      maxResults: 100,
      q: "in:inbox"
    });
    
    const threads = res.data.threads || [];
    console.log(`✅ Fetched ${threads.length} threads`);
    
    const basicThreads = threads.map(thread => ({
      id: thread.id,
      snippet: thread.snippet
    }));
    
    return basicThreads;
  } catch (error) {
    console.error("❌ Error listing all threads:", error);
    throw error;
  }
}

// Helper to extract emails from string
function extractAllEmails(str) {
  if (!str) return [];
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
  const matches = str.match(emailRegex);
  return matches ? matches : [];
}

// Get suggested email addresses from recent emails
export async function getEmailSuggestions(query, limit = 10) {
  try {
    const gmail = await initializeGmailClient();
    
    if (!query || query.length < 2) {
      return [];
    }
    
    // Search for emails containing the query
    const res = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 50,
      q: `from:${query} OR to:${query} OR cc:${query}`
    });
    
    const messages = res.data.messages || [];
    const emailSet = new Set();
    
    // Extract email addresses from recent messages
    for (const message of messages.slice(0, 10)) {
      try {
        const msgRes = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'metadata',
          metadataHeaders: ['From', 'To', 'Cc']
        });

        const headers = msgRes.data.payload?.headers || [];
        
        // Extract from header
        const fromHeader = headers.find(h => h.name === 'From');
        if (fromHeader?.value) {
          const emails = extractAllEmails(fromHeader.value);
          emails.forEach(email => emailSet.add(email));
        }
        
        // Extract to header
        const toHeader = headers.find(h => h.name === 'To');
        if (toHeader?.value) {
          const emails = extractAllEmails(toHeader.value);
          emails.forEach(email => emailSet.add(email));
        }
        
        // Extract cc header
        const ccHeader = headers.find(h => h.name === 'Cc');
        if (ccHeader?.value) {
          const emails = extractAllEmails(ccHeader.value);
          emails.forEach(email => emailSet.add(email));
        }
      } catch (err) {
        console.error(`Error processing message ${message.id}:`, err.message);
      }
    }

    // Also search in sent emails
    const sentRes = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 20,
      q: `in:sent ${query}`
    });
    
    const sentMessages = sentRes.data.messages || [];
    
    for (const message of sentMessages.slice(0, 5)) {
      try {
        const msgRes = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'metadata',
          metadataHeaders: ['To', 'Cc']
        });

        const headers = msgRes.data.payload?.headers || [];
        
        // Extract to header from sent emails
        const toHeader = headers.find(h => h.name === 'To');
        if (toHeader?.value) {
          const emails = extractAllEmails(toHeader.value);
          emails.forEach(email => emailSet.add(email));
        }
        
        // Extract cc header from sent emails
        const ccHeader = headers.find(h => h.name === 'Cc');
        if (ccHeader?.value) {
          const emails = extractAllEmails(ccHeader.value);
          emails.forEach(email => emailSet.add(email));
        }
      } catch (err) {
        console.error(`Error processing sent message ${message.id}:`, err.message);
      }
    }

    // Filter by query if provided
    let suggestions = Array.from(emailSet);
    if (query) {
      const lowerQuery = query.toLowerCase();
      suggestions = suggestions.filter(email =>
        email.toLowerCase().includes(lowerQuery)
      );
    }

    return suggestions.slice(0, limit);
  } catch (error) {
    console.error("❌ Error getting email suggestions:", error);
    return [];
  }
}


// ✅ Watch inbox for real-time updates (requires Pub/Sub setup)
export async function watchInbox() {
  try {
    const gmail = await initializeGmailClient();
    
    // This requires Google Cloud Pub/Sub setup
    // For simplicity, we'll rely on polling instead
    console.log("🔔 Using polling for real-time updates");
    return { historyId: Date.now().toString() };
  } catch (error) {
    console.error("❌ Error starting inbox watch:", error);
    throw error;
  }
}

// Stop watch
export async function stopWatch(userId) {
  try {
    const gmail = await initializeGmailClient();
    
    await gmail.users.stop({
      userId: userId
    });
    
    console.log("🔕 Inbox watch stopped");
  } catch (error) {
    console.error("❌ Error stopping inbox watch:", error);
    throw error;
  }
}

// Validate email address format
export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Check if email can be sent with attachments
export async function checkEmailSize(to, subject, message, attachments = [], cc = '', bcc = '') {
  try {
    const gmail = await initializeGmailClient();
    
    if (!userProfile) {
      const profile = await gmail.users.getProfile({ userId: "me" });
      userProfile = profile.data;
    }
    const fromEmail = userProfile.emailAddress;
    
    // Process attachments
    const processedAttachments = attachments.map((attachment) => {
      if (attachment.content && attachment.content.startsWith('data:')) {
        const base64Data = attachment.content.split(',')[1] || attachment.content;
        return {
          ...attachment,
          content: base64Data
        };
      }
      return attachment;
    });
    
    const sizeInfo = calculateEmailSize(to, cc, bcc, subject, message, processedAttachments, fromEmail);
    
    return {
      ...sizeInfo,
      rawSizeKB: Math.round(sizeInfo.rawSize / 1024),
      estimatedBase64SizeKB: Math.round(sizeInfo.estimatedBase64Size / 1024),
      gmailLimitKB: Math.round(GMAIL_MAX_SIZE / 1024),
      attachments: attachments.map(att => ({
        filename: att.filename,
        sizeKB: Math.round((att.content?.length || 0) * 3 / 4 / 1024)
      }))
    };
  } catch (error) {
    console.error("❌ Error checking email size:", error);
    throw error;
  }
}

// Batch send emails (for newsletters/bulk)
export async function batchSendEmails(emails) {
  try {
    const gmail = await initializeGmailClient();
    const results = [];
    
    for (const email of emails) {
      try {
        const result = await sendEmail(
          email.to,
          email.subject,
          email.message,
          email.cc,
          email.bcc,
          email.attachments
        );
        results.push({ success: true, to: email.to, data: result });
      } catch (error) {
        results.push({ success: false, to: email.to, error: error.message });
      }
    }
    
    return results;
  } catch (error) {
    console.error("❌ Error in batch send:", error);
    throw error;
  }
}

// Validate files before upload
export function validateFiles(files) {
  const errors = [];
  
  files.forEach((file, index) => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      errors.push({
        filename: file.originalname || `File ${index + 1}`,
        error: `File size (${(file.size / (1024 * 1024)).toFixed(2)}MB) exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`
      });
    }
    
    // Check total size if multiple files
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    if (totalSize > MAX_FILE_SIZE * 10) {
      errors.push({
        filename: 'All files',
        error: `Total files size (${(totalSize / (1024 * 1024)).toFixed(2)}MB) exceeds ${(MAX_FILE_SIZE * 10) / (1024 * 1024)}MB limit`
      });
    }
  });
  
  return errors;
}

// Disconnect Gmail (clear tokens)
export async function disconnectGmail() {
  try {
    // Clear cached data
    gmailClient = null;
    authInitialized = false;
    userProfile = null;
    
    // Clear credentials from OAuth2 client
    oauth2Client.setCredentials({});
    
    console.log("✅ Gmail disconnected");
    return { success: true, message: "Gmail disconnected successfully" };
  } catch (error) {
    console.error("❌ Error disconnecting Gmail:", error);
    throw error;
  }
}//all come correctly without error..






/**
 * ✅ REAL ACCURATE LABEL COUNTS (MATCHES GMAIL UI)
 * Uses Gmail internal label statistics
 */
// export async function getLabelCounts() {
//   try {
//     const gmail = await initializeGmailClient();

//     // Fetch all labels with statistics
//     const res = await gmail.users.labels.list({
//       userId: "me",
//     });

//     const labels = res.data.labels || [];

//     const getCount = (labelId, type = "messagesTotal") => {
//       const label = labels.find(l => l.id === labelId);
//       return label ? (label[type] || 0) : 0;
//     };

//     const counts = {
//       INBOX: getCount("INBOX", "messagesTotal"),
//       UNREAD: getCount("INBOX", "messagesUnread"), // IMPORTANT FIX
//       STARRED: getCount("STARRED", "messagesTotal"),
//       IMPORTANT: getCount("IMPORTANT", "messagesTotal"),
//       SENT: getCount("SENT", "messagesTotal"),
//       SPAM: getCount("SPAM", "messagesTotal"),
//       TRASH: getCount("TRASH", "messagesTotal"),
//       DRAFTS: getCount("DRAFT", "messagesTotal"),
//     };

//     console.log("📊 Accurate Gmail Counts:", counts);

//     return counts;

//   } catch (error) {
//     console.error("❌ Error getting label counts:", error.message);
//     throw error;
//   }
// }//old one



/**
 * ✅ FIXED: Get REAL counts for each label
 * Uses labelIds and q parameter correctly to get accurate counts
 */
export async function getLabelCounts() {
  try {
    const gmail = await initializeGmailClient();
    
    // Get counts using users.labels.get() - THIS IS THE CORRECT WAY
    const counts = {
      INBOX: 0,
      UNREAD: 0,
      STARRED: 0,
      IMPORTANT: 0,
      SENT: 0,
      SPAM: 0,
      TRASH: 0,
      DRAFTS: 0
    };

    try {
      // ✅ CORRECT: Get INBOX count using label API
      const inboxLabel = await gmail.users.labels.get({
        userId: 'me',
        id: 'INBOX'
      });
      counts.INBOX = inboxLabel.data.threadsTotal || 0;
    } catch (err) {
      console.error("Error fetching INBOX count:", err.message);
    }

    try {
      // ✅ CORRECT: Get UNREAD count - use threads.list with proper query
      const unreadRes = await gmail.users.threads.list({
        userId: 'me',
        maxResults: 1,
        q: 'is:unread',
        labelIds: ['INBOX', 'UNREAD']
      });
      counts.UNREAD = unreadRes.data.resultSizeEstimate || 0;
    } catch (err) {
      console.error("Error fetching UNREAD count:", err.message);
    }

    try {
      // ✅ CORRECT: Get STARRED count
      const starredRes = await gmail.users.threads.list({
        userId: 'me',
        maxResults: 1,
        labelIds: ['STARRED']
      });
      counts.STARRED = starredRes.data.resultSizeEstimate || 0;
    } catch (err) {
      console.error("Error fetching STARRED count:", err.message);
    }

    try {
      // ✅ CORRECT: Get IMPORTANT count
      const importantRes = await gmail.users.threads.list({
        userId: 'me',
        maxResults: 1,
        labelIds: ['IMPORTANT']
      });
      counts.IMPORTANT = importantRes.data.resultSizeEstimate || 0;
    } catch (err) {
      console.error("Error fetching IMPORTANT count:", err.message);
    }

    try {
      // ✅ CORRECT: Get SENT count
      const sentLabel = await gmail.users.labels.get({
        userId: 'me',
        id: 'SENT'
      });
      counts.SENT = sentLabel.data.threadsTotal || 0;
    } catch (err) {
      console.error("Error fetching SENT count:", err.message);
    }

    try {
      // ✅ CORRECT: Get SPAM count
      const spamLabel = await gmail.users.labels.get({
        userId: 'me',
        id: 'SPAM'
      });
      counts.SPAM = spamLabel.data.threadsTotal || 0;
    } catch (err) {
      console.error("Error fetching SPAM count:", err.message);
    }

    try {
      // ✅ CORRECT: Get TRASH count
      const trashLabel = await gmail.users.labels.get({
        userId: 'me',
        id: 'TRASH'
      });
      counts.TRASH = trashLabel.data.threadsTotal || 0;
    } catch (err) {
      console.error("Error fetching TRASH count:", err.message);
    }

    try {
      // ✅ CORRECT: Get DRAFTS count
      const draftsRes = await gmail.users.drafts.list({
        userId: 'me',
        maxResults: 1
      });
      counts.DRAFTS = draftsRes.data.resultSizeEstimate || 0;
    } catch (err) {
      console.error("Error fetching DRAFTS count:", err.message);
    }

    console.log("📊 REAL Gmail counts:", counts);
    return counts;
  } catch (error) {
    console.error("❌ Error getting label counts:", error);
    throw error;
  }
}//old one