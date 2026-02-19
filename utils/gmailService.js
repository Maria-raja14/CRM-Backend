import { google } from "googleapis";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mime from "mime-types";
import multer from "multer";
import GmailToken from "../models/GmailToken.js";

// Load environment variables first
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Detect environment
const isProduction = process.env.NODE_ENV === "production";
console.log(
  `📧 Gmail Service running in ${isProduction ? "PRODUCTION" : "DEVELOPMENT"} mode`,
);

// ✅ Use the correct redirect URI based on environment
const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REDIRECT_URI = isProduction
  ? process.env.GMAIL_LIVE_REDIRECT_URI
  : process.env.GMAIL_REDIRECT_URI;

console.log(`📧 Using redirect URI: ${REDIRECT_URI}`);

// Validate required environment variables
if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    "❌ Missing Gmail OAuth credentials. Please check your .env file",
  );
  throw new Error("Gmail OAuth credentials not configured");
}

export const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI,
);

// Cache for current session
let currentGmailClient = null;
let currentUserEmail = null;
let tokenRefreshInProgress = false;

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
    if (req.headers["content-length"] > MAX_FILE_SIZE * 10) {
      return cb(new Error("Total files size exceeds 300MB limit"));
    }
    // Allow all file types
    cb(null, true);
  },
});

/**
 * Initialize Gmail client with tokens from database
 */
export async function initializeGmailClient(email = null) {
  try {
    console.log("🔄 Initializing Gmail client...");

    // If we have a current client and it's for the requested email, return it
    if (
      currentGmailClient &&
      currentUserEmail &&
      (!email || currentUserEmail === email)
    ) {
      console.log(`✅ Using existing Gmail client for ${currentUserEmail}`);
      return currentGmailClient;
    }

    // Find active token in database
    const tokenQuery = email ? { email, is_active: true } : { is_active: true };
    const tokenDoc = await GmailToken.findOne(tokenQuery).sort({
      last_connected: -1,
    });

    if (!tokenDoc) {
      console.log("❌ No active Gmail tokens found in database");
      throw new Error("No valid Gmail tokens found. Connect Gmail first.");
    }

    console.log(`✅ Found token for email: ${tokenDoc.email}`);

    // Check if token is expired
    const now = new Date();
    const expiryDate = new Date(tokenDoc.expiry_date);

    let tokens = {
      access_token: tokenDoc.access_token,
      refresh_token: tokenDoc.refresh_token,
      token_type: tokenDoc.token_type,
      expiry_date: expiryDate.getTime(),
      scope: tokenDoc.scope,
    };

    // Create OAuth2 client
    const oauth2ClientWithTokens = new google.auth.OAuth2(
      CLIENT_ID,
      CLIENT_SECRET,
      REDIRECT_URI,
    );

    oauth2ClientWithTokens.setCredentials(tokens);

    // Check if token needs refresh
    if (now > expiryDate) {
      console.log(`🔄 Token expired for ${tokenDoc.email}, refreshing...`);

      if (tokenRefreshInProgress) {
        console.log("⏳ Token refresh already in progress, waiting...");
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return initializeGmailClient(email);
      }

      tokenRefreshInProgress = true;

      try {
        const { credentials } =
          await oauth2ClientWithTokens.refreshAccessToken();

        // Update tokens in database
        tokenDoc.access_token = credentials.access_token;
        tokenDoc.expiry_date = new Date(credentials.expiry_date);
        if (credentials.refresh_token) {
          tokenDoc.refresh_token = credentials.refresh_token;
        }
        tokenDoc.last_connected = new Date();
        await tokenDoc.save();

        console.log(`✅ Token refreshed and saved for ${tokenDoc.email}`);

        // Update OAuth2 client with new tokens
        oauth2ClientWithTokens.setCredentials(credentials);

        tokenRefreshInProgress = false;
      } catch (refreshError) {
        tokenRefreshInProgress = false;
        console.error(
          `❌ Failed to refresh token for ${tokenDoc.email}:`,
          refreshError.message,
        );
        throw new Error(
          "Token expired and could not be refreshed. Please reconnect Gmail.",
        );
      }
    }

    // Create Gmail client
    currentGmailClient = google.gmail({
      version: "v1",
      auth: oauth2ClientWithTokens,
    });

    currentUserEmail = tokenDoc.email;

    // Also update the global oauth2Client
    oauth2Client.setCredentials(tokens);

    console.log(
      `✅ Gmail client initialized successfully for ${currentUserEmail}`,
    );
    return currentGmailClient;
  } catch (error) {
    console.error("❌ Error initializing Gmail client:", error.message);

    // Reset current client on error
    currentGmailClient = null;
    currentUserEmail = null;

    throw new Error(`Failed to initialize Gmail client: ${error.message}`);
  }
}

/**
 * Generate Google OAuth URL
 */
export function generateAuthUrl() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("Gmail OAuth credentials not configured");
  }

  const scopes = [
    "https://mail.google.com/",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.compose",
    "https://www.googleapis.com/auth/gmail.readonly",
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: scopes,
  });

  console.log("🔗 Generated auth URL");
  return authUrl;
}

/**
 * Save tokens to database
 */
export async function saveTokens(tokens) {
  try {
    console.log("💾 Saving tokens to database...");

    // Create OAuth2 client to get user info
    const tempOAuth2Client = new google.auth.OAuth2(
      CLIENT_ID,
      CLIENT_SECRET,
      REDIRECT_URI,
    );
    tempOAuth2Client.setCredentials(tokens);

    // Get user email
    const gmail = google.gmail({ version: "v1", auth: tempOAuth2Client });
    const profile = await gmail.users.getProfile({ userId: "me" });
    const email = profile.data.emailAddress;

    console.log(`📧 Got user email: ${email}`);

    // Calculate expiry date
    let expiryDate = new Date();
    if (tokens.expiry_date) {
      expiryDate = new Date(tokens.expiry_date);
    } else {
      expiryDate.setHours(expiryDate.getHours() + 1); // Default 1 hour
    }

    // Check if token already exists for this email
    const existingToken = await GmailToken.findOne({ email });

    if (existingToken) {
      // Update existing token
      existingToken.access_token = tokens.access_token;
      if (tokens.refresh_token) {
        existingToken.refresh_token = tokens.refresh_token;
      }
      existingToken.token_type = tokens.token_type || "Bearer";
      existingToken.expiry_date = expiryDate;
      existingToken.scope = tokens.scope || "";
      existingToken.is_active = true;
      existingToken.last_connected = new Date();

      await existingToken.save();
      console.log(`✅ Updated existing token for ${email}`);
    } else {
      // Create new token
      const newToken = new GmailToken({
        email,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_type: tokens.token_type || "Bearer",
        expiry_date: expiryDate,
        scope: tokens.scope || "",
        is_active: true,
        last_connected: new Date(),
      });

      await newToken.save();
      console.log(`✅ Created new token for ${email}`);
    }

    // Deactivate any other tokens for this email (shouldn't happen, but just in case)
    await GmailToken.updateMany(
      { email, is_active: true },
      { is_active: false },
    );

    // Reactivate this one
    await GmailToken.updateOne({ email }, { is_active: true });

    // Set credentials on the global oauth2Client
    oauth2Client.setCredentials(tokens);

    // Reset cached client
    currentGmailClient = null;
    currentUserEmail = null;

    console.log(`✅ Tokens saved successfully for ${email}`);
    return { success: true, email };
  } catch (error) {
    console.error("❌ Error saving tokens:", error);
    throw new Error(`Failed to save tokens: ${error.message}`);
  }
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code) {
  try {
    console.log("🔄 Exchanging code for tokens...");
    const { tokens } = await oauth2Client.getToken(code);
    console.log("✅ Received tokens from Google");

    // Save tokens to database
    const result = await saveTokens(tokens);

    console.log(
      `✅ Tokens exchanged and saved successfully for ${result.email}`,
    );
    return { ...tokens, email: result.email };
  } catch (error) {
    console.error("❌ Error exchanging code for tokens:", error);
    console.error("Full error:", error.response?.data || error.message);
    throw new Error(`Failed to exchange code for tokens: ${error.message}`);
  }
}

/**
 * Check authentication status
 */
export async function checkAuth(email = null) {
  try {
    console.log("🔐 Checking authentication status...");

    // Find active token in database
    const tokenQuery = email ? { email, is_active: true } : { is_active: true };
    const tokenDoc = await GmailToken.findOne(tokenQuery).sort({
      last_connected: -1,
    });

    if (!tokenDoc) {
      console.log("❌ No active Gmail tokens found");
      return {
        authenticated: false,
        message: "No Gmail account connected",
        email: null,
      };
    }

    // Try to initialize client
    try {
      const gmail = await initializeGmailClient(tokenDoc.email);

      // Verify by getting profile
      const profile = await gmail.users.getProfile({ userId: "me" });

      console.log(`✅ Auth check successful for ${tokenDoc.email}`);

      return {
        authenticated: true,
        message: "Gmail is connected",
        email: tokenDoc.email,
        profile: profile.data,
      };
    } catch (error) {
      console.error("❌ Auth check failed:", error.message);

      // Token might be invalid, deactivate it
      tokenDoc.is_active = false;
      await tokenDoc.save();

      return {
        authenticated: false,
        message: `Authentication failed: ${error.message}`,
        email: tokenDoc.email,
      };
    }
  } catch (error) {
    console.error("❌ Error checking auth status:", error);
    return {
      authenticated: false,
      message: "Error checking authentication status",
    };
  }
}

/**
 * Disconnect Gmail (deactivate token)
 */
export async function disconnectGmail(email = null) {
  try {
    console.log("🔌 Disconnecting Gmail...");

    const tokenQuery = email ? { email, is_active: true } : { is_active: true };
    const tokenDoc = await GmailToken.findOne(tokenQuery);

    if (tokenDoc) {
      tokenDoc.is_active = false;
      await tokenDoc.save();
      console.log(`✅ Deactivated token for ${tokenDoc.email}`);
    }

    // Clear cached data
    currentGmailClient = null;
    currentUserEmail = null;

    // Clear credentials from OAuth2 client
    oauth2Client.setCredentials({});

    console.log("✅ Gmail disconnected successfully");
    return {
      success: true,
      message: tokenDoc
        ? `Gmail disconnected for ${tokenDoc.email}`
        : "Gmail disconnected successfully",
    };
  } catch (error) {
    console.error("❌ Error disconnecting Gmail:", error);
    throw error;
  }
}

export async function getLabelCounts() {
  try {
    const gmail = await initializeGmailClient();

    const labelIds = [
      "INBOX",
      "UNREAD",
      "STARRED",
      "IMPORTANT",
      "SENT",
      "SPAM",
      "TRASH",
      "DRAFT",
    ];

    const counts = {};

    for (const labelId of labelIds) {
      try {
        const res = await gmail.users.labels.get({
          userId: "me",
          id: labelId,
        });

        counts[labelId === "DRAFT" ? "DRAFTS" : labelId] =
          res.data.threadsTotal || 0;
      } catch (err) {
        console.error(`Error fetching ${labelId}:`, err.message);
        counts[labelId] = 0;
      }
    }

    console.log("📊 FINAL Gmail counts:", counts);
    return counts;
  } catch (error) {
    console.error("❌ Error getting label counts:", error);
    throw error;
  }
}

/**
 * List threads with OPTIMIZED fetching - MUCH FASTER
 * Uses batch requests and minimal data
 */
export async function listThreads(
  maxResults = 20,
  pageToken = null,
  label = "INBOX",
) {
  try {
    const gmail = await initializeGmailClient();
    const startTime = Date.now();

    // Build query parameters
    let params = {
      userId: "me",
      maxResults: maxResults,
      pageToken: pageToken,
      includeSpamTrash: label === "SPAM" || label === "TRASH",
    };

    // Set labelIds based on label for ACCURATE filtering
    switch (label) {
      case "INBOX":
        params.labelIds = ["INBOX"];
        break;
      case "UNREAD":
        params.q = "is:unread";
        params.labelIds = ["INBOX"];
        break;
      case "STARRED":
        params.labelIds = ["STARRED"];
        break;
      case "IMPORTANT":
        params.labelIds = ["IMPORTANT"];
        break;
      case "SENT":
        params.labelIds = ["SENT"];
        break;
      case "SPAM":
        params.labelIds = ["SPAM"];
        break;
      case "TRASH":
        params.labelIds = ["TRASH"];
        break;
      case "DRAFTS":
        // For drafts, we need to use drafts.list instead
        const draftsRes = await gmail.users.drafts.list({
          userId: "me",
          maxResults: maxResults,
          pageToken: pageToken,
        });

        const drafts = draftsRes.data.drafts || [];
        const draftThreads = [];

        // Process drafts in parallel for speed
        const draftPromises = drafts.map(async (draft) => {
          try {
            const message = draft.message;
            const headers = message?.payload?.headers || [];

            return {
              id: draft.id,
              threadId: message?.threadId || draft.id,
              snippet: message?.snippet || "",
              subject:
                headers.find((h) => h.name === "Subject")?.value ||
                "No Subject",
              from: headers.find((h) => h.name === "From")?.value || "Unknown",
              to: headers.find((h) => h.name === "To")?.value || "",
              date:
                headers.find((h) => h.name === "Date")?.value ||
                new Date().toISOString(),
              timestamp: Date.now(),
              unread: false,
              starred: false,
              important: false,
              spam: false,
              trash: false,
              isDraft: true, // FIX: mark as draft
              messagesCount: 1,
            };
          } catch (err) {
            return null;
          }
        });

        const draftResults = await Promise.all(draftPromises);
        const validDrafts = draftResults.filter((d) => d !== null);

        console.log(
          `✅ Fetched ${validDrafts.length} drafts in ${Date.now() - startTime}ms`,
        );

        return {
          threads: validDrafts,
          nextPageToken: draftsRes.data.nextPageToken,
          resultSizeEstimate: validDrafts.length,
        };

      default:
        params.labelIds = [label];
    }

    // Get thread list (this is fast - just IDs)
    const res = await gmail.users.threads.list(params);
    const threads = res.data.threads || [];

    console.log(
      `📋 Got ${threads.length} thread IDs from ${label} (Total: ${res.data.resultSizeEstimate || 0})`,
    );

    // If no threads, return empty
    if (threads.length === 0) {
      return {
        threads: [],
        nextPageToken: res.data.nextPageToken,
        resultSizeEstimate: res.data.resultSizeEstimate || 0,
      };
    }

    // OPTIMIZATION: Fetch all thread details in PARALLEL
    const detailedThreads = [];

    const threadPromises = threads.map(async (thread) => {
      try {
        // Use format: 'metadata' which is faster than 'full'
        const threadRes = await gmail.users.threads.get({
          userId: "me",
          id: thread.id,
          format: "metadata",
          metadataHeaders: ["Subject", "From", "Date", "To"],
        });

        const messages = threadRes.data.messages || [];
        const firstMessage = messages[0];

        if (!firstMessage) return null;

        const headers = firstMessage?.payload?.headers || [];

        const subject =
          headers.find((h) => h.name === "Subject")?.value || "No Subject";
        const from = headers.find((h) => h.name === "From")?.value || "Unknown";
        const to = headers.find((h) => h.name === "To")?.value || "";
        const date = headers.find((h) => h.name === "Date")?.value || "";

        // Get REAL label IDs to determine status
        const labelIds = firstMessage?.labelIds || [];

        let timestamp = 0;
        if (date) {
          timestamp = new Date(date).getTime();
        }

        return {
          id: thread.id,
          snippet: thread.snippet || "",
          subject,
          from,
          to,
          date,
          timestamp,
          unread: labelIds.includes("UNREAD"),
          starred: labelIds.includes("STARRED"),
          important: labelIds.includes("IMPORTANT"),
          spam: labelIds.includes("SPAM"),
          trash: labelIds.includes("TRASH"),
          drafts: labelIds.includes("DRAFT"),
          messagesCount: messages.length,
        };
      } catch (err) {
        console.error(`Error fetching thread ${thread.id}:`, err.message);
        return {
          id: thread.id,
          snippet: thread.snippet || "",
          subject: "No Subject",
          from: "Unknown",
          to: "",
          date: "",
          timestamp: 0,
          unread: false,
          starred: false,
          important: false,
          spam: false,
          trash: false,
          drafts: false,
          messagesCount: 0,
        };
      }
    });

    const results = await Promise.all(threadPromises);
    for (const result of results) {
      if (result) detailedThreads.push(result);
    }

    detailedThreads.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    const duration = Date.now() - startTime;
    console.log(
      `✅ Fetched ${detailedThreads.length} threads in ${duration}ms`,
    );

    return {
      threads: detailedThreads,
      nextPageToken: res.data.nextPageToken,
      resultSizeEstimate: res.data.resultSizeEstimate || detailedThreads.length,
    };
  } catch (error) {
    console.error("❌ Error listing threads:", error);
    throw error;
  }
}

/**
 * Mark thread as read/unread
 */
export async function markAsRead(threadId, read = true) {
  try {
    const gmail = await initializeGmailClient();

    const res = await gmail.users.threads.modify({
      userId: "me",
      id: threadId,
      requestBody: {
        addLabelIds: read ? [] : ["UNREAD"],
        removeLabelIds: read ? ["UNREAD"] : [],
      },
    });

    console.log(`✅ Thread ${threadId} marked as ${read ? "read" : "unread"}`);
    return { success: true, ...res.data };
  } catch (error) {
    console.error("❌ Error marking thread:", error);
    throw error;
  }
}

/**
 * Send email with attachments (FIXED)
 */
export async function sendEmailWithAttachments(
  to,
  subject,
  message,
  cc = "",
  bcc = "",
  attachments = [],
  files = [],
) {
  try {
    const startTime = Date.now();
    console.log("🚀 Starting email send process...");

    // Validate recipient email
    const emailList = processEmailList(to);
    if (emailList.length === 0) {
      throw new Error(`Invalid recipient email address: ${to}`);
    }

    const gmail = await initializeGmailClient();

    // Get user's email from token
    const tokenDoc = await GmailToken.findOne({ is_active: true });
    if (!tokenDoc) {
      throw new Error("No active Gmail account found");
    }
    const fromEmail = tokenDoc.email;

    // CRITICAL FIX: Combine attachments from both sources
    const allAttachments = [];

    // Process attachments array (from route)
    if (attachments && attachments.length > 0) {
      for (const attachment of attachments) {
        if (attachment.content && attachment.filename) {
          allAttachments.push({
            filename: attachment.filename,
            content: attachment.content,
            mimetype:
              attachment.mimetype ||
              mime.lookup(attachment.filename) ||
              "application/octet-stream",
            size: attachment.size || 0,
          });
        }
      }
    }

    // Process files array (from multer)
    if (files && files.length > 0) {
      for (const file of files) {
        if (file.buffer && file.originalname) {
          // Validate file size
          if (file.size > 25 * 1024 * 1024) {
            throw new Error(`File ${file.originalname} exceeds 25MB limit`);
          }

          allAttachments.push({
            filename: file.originalname,
            content: file.buffer.toString("base64"),
            mimetype:
              file.mimetype ||
              mime.lookup(file.originalname) ||
              "application/octet-stream",
            size: file.size,
          });
        }
      }
    }

    console.log(`📧 Total attachments to send: ${allAttachments.length}`);

    // Prepare email addresses
    const fullTo = emailList.join(", ");
    const ccList = processEmailList(cc);
    const bccList = processEmailList(bcc);
    const fullCc = ccList.join(", ");
    const fullBcc = bccList.join(", ");

    // Create proper MIME email
    const boundary = `boundary_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    const nl = "\r\n";

    // Build email headers
    let email = [
      `MIME-Version: 1.0`,
      `To: ${fullTo}`,
      `From: ${fromEmail}`,
      `Subject: ${subject || "(No Subject)"}`,
    ];

    if (fullCc) email.push(`Cc: ${fullCc}`);
    if (fullBcc) email.push(`Bcc: ${fullBcc}`);

    email.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    email.push("");

    // Add text/plain part
    email.push(`--${boundary}`);
    email.push(`Content-Type: text/plain; charset="UTF-8"`);
    email.push(`Content-Transfer-Encoding: quoted-printable`);
    email.push("");
    email.push(message || " ");
    email.push("");

    // Add HTML part for better compatibility
    email.push(`--${boundary}`);
    email.push(`Content-Type: text/html; charset="UTF-8"`);
    email.push(`Content-Transfer-Encoding: quoted-printable`);
    email.push("");
    email.push(
      `<div style="font-family: Arial, sans-serif;">${message || " "}</div>`,
    );
    email.push("");

    // Add attachments
    if (allAttachments.length > 0) {
      for (const attachment of allAttachments) {
        try {
          const mimeType =
            attachment.mimetype ||
            mime.lookup(attachment.filename) ||
            "application/octet-stream";

          // Format base64 content (RFC 2822 requires lines <= 78 characters)
          const base64Content = attachment.content
            .replace(/\s/g, "")
            .match(/.{1,76}/g)
            .join(nl);

          email.push(`--${boundary}`);
          email.push(
            `Content-Type: ${mimeType}; name="${attachment.filename}"`,
          );
          email.push(
            `Content-Disposition: attachment; filename="${attachment.filename}"`,
          );
          email.push(`Content-Transfer-Encoding: base64`);
          email.push("");
          email.push(base64Content);
          email.push("");
        } catch (attErr) {
          console.error(
            `❌ Error adding attachment ${attachment.filename}:`,
            attErr,
          );
          throw new Error(
            `Failed to process attachment: ${attachment.filename}`,
          );
        }
      }
    }

    // Close boundary
    email.push(`--${boundary}--`);
    email.push("");

    // Combine all parts
    const emailString = email.join(nl);

    // Calculate size
    const rawSize = Buffer.byteLength(emailString, "utf8");
    const base64Size = Math.ceil((rawSize * 4) / 3);

    if (base64Size > 25 * 1024 * 1024) {
      throw new Error(
        `Email size exceeds Gmail's 25MB limit. Please reduce attachment sizes.`,
      );
    }

    // Convert to base64url
    const base64Email = Buffer.from(emailString, "utf8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    // Send email
    const res = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: base64Email,
      },
    });

    const duration = (Date.now() - startTime) / 1000;

    console.log(`✅ Email sent successfully!`);

    return {
      success: true,
      id: res.data.id,
      threadId: res.data.threadId,
      labelIds: res.data.labelIds || [],
      sendTime: duration,
    };
  } catch (error) {
    console.error("❌ Error in sendEmailWithAttachments:", error);
    throw error;
  }
}

/**
 * Save draft
 */
export async function saveDraft(
  to,
  subject,
  message,
  cc = "",
  bcc = "",
  attachments = [],
  files = [],
) {
  try {
    console.log("📝 Creating draft...");

    const gmail = await initializeGmailClient();

    // Get user's email from token
    const tokenDoc = await GmailToken.findOne({ is_active: true });
    if (!tokenDoc) {
      throw new Error("No active Gmail account found");
    }
    const fromEmail = tokenDoc.email;

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
            content: file.buffer.toString("base64"),
            mimetype: file.mimetype,
            size: file.size,
          });
        }
      }
    }

    // Create draft using Gmail API
    const emailResult = await createDraftMessage(
      to,
      subject,
      message,
      cc,
      bcc,
      allAttachments,
      fromEmail,
    );

    const res = await gmail.users.drafts.create({
      userId: "me",
      requestBody: {
        message: {
          raw: emailResult.raw,
        },
      },
    });

    console.log("✅ Draft saved successfully");

    return {
      success: true,
      id: res.data.id,
      message: "Draft saved successfully",
    };
  } catch (error) {
    console.error("❌ Error saving draft:", error);
    throw error;
  }
}

/**
 * Create draft message (helper)
 */
async function createDraftMessage(
  to,
  subject,
  message,
  cc = "",
  bcc = "",
  attachments = [],
  fromEmail,
) {
  const boundary = `boundary_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  const nl = "\r\n";

  // Build email headers
  let email = [
    `MIME-Version: 1.0`,
    `To: ${to}`,
    `From: ${fromEmail}`,
    `Subject: ${subject || "(No Subject)"}`,
  ];

  if (cc) email.push(`Cc: ${cc}`);
  if (bcc) email.push(`Bcc: ${bcc}`);

  email.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
  email.push("");

  // Add text part
  email.push(`--${boundary}`);
  email.push(`Content-Type: text/plain; charset="UTF-8"`);
  email.push(`Content-Transfer-Encoding: quoted-printable`);
  email.push("");
  email.push(message || " ");
  email.push("");

  // Add attachments
  if (attachments && attachments.length > 0) {
    for (const attachment of attachments) {
      const mimeType =
        attachment.mimetype ||
        mime.lookup(attachment.filename) ||
        "application/octet-stream";

      const base64Content = attachment.content
        .replace(/\s/g, "")
        .match(/.{1,76}/g)
        .join(nl);

      email.push(`--${boundary}`);
      email.push(`Content-Type: ${mimeType}; name="${attachment.filename}"`);
      email.push(
        `Content-Disposition: attachment; filename="${attachment.filename}"`,
      );
      email.push(`Content-Transfer-Encoding: base64`);
      email.push("");
      email.push(base64Content);
      email.push("");
    }
  }

  email.push(`--${boundary}--`);
  email.push("");

  const emailString = email.join(nl);

  // Convert to base64url
  const base64Email = Buffer.from(emailString, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return { raw: base64Email };
}

/**
 * Get drafts
 */
export async function getDrafts(maxResults = 20) {
  try {
    const gmail = await initializeGmailClient();

    const res = await gmail.users.drafts.list({
      userId: "me",
      maxResults: maxResults,
    });

    return res.data.drafts || [];
  } catch (error) {
    console.error("❌ Error getting drafts:", error);
    throw error;
  }
}

// ============= NEW FUNCTION: Get a single draft =============
/**
 * Get a single draft with full content
 */
export async function getDraft(draftId) {
  try {
    const gmail = await initializeGmailClient();
    const res = await gmail.users.drafts.get({
      userId: "me",
      id: draftId,
      format: "full",
    });

    const message = res.data.message;
    const headers = message?.payload?.headers || [];
    const subject = headers.find((h) => h.name === "Subject")?.value || "No Subject";
    const from = headers.find((h) => h.name === "From")?.value || "Unknown";
    const to = headers.find((h) => h.name === "To")?.value || "";
    const date = headers.find((h) => h.name === "Date")?.value || "";
    const cc = headers.find((h) => h.name === "Cc")?.value || "";
    const bcc = headers.find((h) => h.name === "Bcc")?.value || "";

    const content = extractContent(message?.payload?.parts || [message?.payload]);

    const processedMessage = {
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
      labelIds: message.labelIds || [],
      isDraft: true,
    };

    // Return in same structure as getThread for frontend consistency
    return {
      messages: [processedMessage],
    };
  } catch (error) {
    console.error("❌ Error getting draft:", error);
    throw error;
  }
}

/**
 * Get single thread with full content
 */
export async function getThread(threadId) {
  try {
    const gmail = await initializeGmailClient();
    const res = await gmail.users.threads.get({
      userId: "me",
      id: threadId,
    });

    console.log(`✅ Fetched thread ${threadId}`);

    // Process messages
    const processedMessages = (res.data.messages || []).map((message) => {
      const headers = message.payload?.headers || [];
      const subject =
        headers.find((h) => h.name === "Subject")?.value || "No Subject";
      const from =
        headers.find((h) => h.name === "From")?.value || "Unknown Sender";
      const to = headers.find((h) => h.name === "To")?.value || "";
      const date = headers.find((h) => h.name === "Date")?.value || "";
      const cc = headers.find((h) => h.name === "Cc")?.value || "";
      const bcc = headers.find((h) => h.name === "Bcc")?.value || "";

      // Get label IDs
      const labelIds = message.labelIds || [];

      // Extract content
      const content = extractContent(
        message.payload?.parts || [message.payload],
      );

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
        unread: labelIds.includes("UNREAD"),
        starred: labelIds.includes("STARRED"),
        important: labelIds.includes("IMPORTANT"),
        spam: labelIds.includes("SPAM"),
        trash: labelIds.includes("TRASH"),
        drafts: labelIds.includes("DRAFT"),
        labelIds: labelIds,
      };
    });

    return {
      ...res.data,
      messages: processedMessages,
    };
  } catch (error) {
    console.error("❌ Error getting thread:", error);
    throw error;
  }
}

/**
 * Get attachment
 */
export async function getAttachment(messageId, attachmentId) {
  try {
    const gmail = await initializeGmailClient();
    const res = await gmail.users.messages.attachments.get({
      userId: "me",
      messageId: messageId,
      id: attachmentId,
    });

    return {
      data: res.data.data,
      size: res.data.size,
    };
  } catch (error) {
    console.error("❌ Error fetching attachment:", error);
    throw error;
  }
}

/**
 * Delete thread
 */
export async function deleteThread(threadId) {
  try {
    const gmail = await initializeGmailClient();

    const res = await gmail.users.threads.delete({
      userId: "me",
      id: threadId,
    });

    console.log(`✅ Thread ${threadId} deleted`);
    return { success: true, ...res.data };
  } catch (error) {
    console.error("❌ Error deleting thread:", error);
    throw error;
  }
}

/**
 * Delete email
 */
export async function deleteEmail(messageId) {
  try {
    const gmail = await initializeGmailClient();

    const res = await gmail.users.messages.delete({
      userId: "me",
      id: messageId,
    });

    console.log(`✅ Email ${messageId} deleted`);
    return { success: true, ...res.data };
  } catch (error) {
    console.error("❌ Error deleting email:", error);
    throw error;
  }
}

/**
 * Star/unstar thread
 */
export async function starThread(threadId, star = true) {
  try {
    const gmail = await initializeGmailClient();

    const res = await gmail.users.threads.modify({
      userId: "me",
      id: threadId,
      requestBody: {
        addLabelIds: star ? ["STARRED"] : [],
        removeLabelIds: star ? [] : ["STARRED"],
      },
    });

    console.log(`✅ Thread ${threadId} ${star ? "starred" : "unstarred"}`);
    return { success: true, ...res.data };
  } catch (error) {
    console.error("❌ Error starring thread:", error);
    throw error;
  }
}

/**
 * Bulk star/unstar threads
 */
export async function bulkStarThreads(threadIds, star = true) {
  try {
    const gmail = await initializeGmailClient();

    console.log(
      `⭐ Bulk ${star ? "starring" : "unstarring"} ${threadIds.length} threads...`,
    );

    const starPromises = threadIds.map(async (threadId) => {
      try {
        await gmail.users.threads.modify({
          userId: "me",
          id: threadId,
          requestBody: {
            addLabelIds: star ? ["STARRED"] : [],
            removeLabelIds: star ? [] : ["STARRED"],
          },
        });
        return { success: true, threadId };
      } catch (error) {
        console.error(
          `❌ Error ${star ? "starring" : "unstarring"} thread ${threadId}:`,
          error.message,
        );
        return { success: false, threadId, error: error.message };
      }
    });

    const results = await Promise.allSettled(starPromises);

    const successful = results.filter(
      (r) => r.status === "fulfilled" && r.value.success,
    );

    console.log(
      `✅ Bulk ${star ? "star" : "unstar"} completed: ${successful.length} successful`,
    );

    return {
      success: true,
      message: `${star ? "Starred" : "Unstarred"} ${successful.length} threads successfully`,
      count: successful.length,
    };
  } catch (error) {
    console.error("❌ Error in bulk star:", error);
    throw error;
  }
}

/**
 * Mark as spam
 */
export async function markAsSpam(threadId, spam = true) {
  try {
    const gmail = await initializeGmailClient();

    const res = await gmail.users.threads.modify({
      userId: "me",
      id: threadId,
      requestBody: {
        addLabelIds: spam ? ["SPAM"] : [],
        removeLabelIds: spam ? [] : ["SPAM"],
      },
    });

    console.log(
      `✅ Thread ${threadId} ${spam ? "marked as spam" : "removed from spam"}`,
    );
    return { success: true, ...res.data };
  } catch (error) {
    console.error("❌ Error marking as spam:", error);
    throw error;
  }
}

/**
 * Mark as important
 */
export async function markAsImportant(threadId, important = true) {
  try {
    const gmail = await initializeGmailClient();

    const res = await gmail.users.threads.modify({
      userId: "me",
      id: threadId,
      requestBody: {
        addLabelIds: important ? ["IMPORTANT"] : [],
        removeLabelIds: important ? [] : ["IMPORTANT"],
      },
    });

    console.log(
      `✅ Thread ${threadId} ${important ? "marked as important" : "removed from important"}`,
    );
    return { success: true, ...res.data };
  } catch (error) {
    console.error("❌ Error marking as important:", error);
    throw error;
  }
}

/**
 * Apply label to thread
 */
export async function applyLabel(threadId, labelId) {
  try {
    const gmail = await initializeGmailClient();

    const res = await gmail.users.threads.modify({
      userId: "me",
      id: threadId,
      requestBody: {
        addLabelIds: [labelId],
      },
    });

    console.log(`✅ Label applied to thread ${threadId}`);
    return { success: true, ...res.data };
  } catch (error) {
    console.error("❌ Error applying label:", error);
    throw error;
  }
}

/**
 * Move to trash
 */
export async function moveToTrash(threadId) {
  try {
    const gmail = await initializeGmailClient();

    const res = await gmail.users.threads.trash({
      userId: "me",
      id: threadId,
    });

    console.log(`✅ Thread ${threadId} moved to trash`);
    return { success: true, ...res.data };
  } catch (error) {
    console.error("❌ Error moving to trash:", error);
    throw error;
  }
}

/**
 * Bulk move to trash
 */
export async function bulkMoveToTrash(threadIds) {
  try {
    const gmail = await initializeGmailClient();

    console.log(`🗑️ Bulk moving ${threadIds.length} threads to trash...`);

    const trashPromises = threadIds.map(async (threadId) => {
      try {
        await gmail.users.threads.trash({
          userId: "me",
          id: threadId,
        });
        return { success: true, threadId };
      } catch (error) {
        console.error(
          `❌ Error moving thread ${threadId} to trash:`,
          error.message,
        );
        return { success: false, threadId, error: error.message };
      }
    });

    const results = await Promise.allSettled(trashPromises);

    const successful = results.filter(
      (r) => r.status === "fulfilled" && r.value.success,
    );

    console.log(
      `✅ Bulk move to trash completed: ${successful.length} successful`,
    );

    return {
      success: true,
      message: `Moved ${successful.length} threads to trash`,
      count: successful.length,
    };
  } catch (error) {
    console.error("❌ Error in bulk move to trash:", error);
    throw error;
  }
}

/**
 * Bulk delete threads
 */
export async function bulkDeleteThreads(threadIds) {
  try {
    const gmail = await initializeGmailClient();

    console.log(`🗑️ Bulk deleting ${threadIds.length} threads...`);

    const deletePromises = threadIds.map(async (threadId) => {
      try {
        await gmail.users.threads.delete({
          userId: "me",
          id: threadId,
        });
        return { success: true, threadId };
      } catch (error) {
        console.error(`❌ Error deleting thread ${threadId}:`, error.message);
        return { success: false, threadId, error: error.message };
      }
    });

    const results = await Promise.allSettled(deletePromises);

    const successful = results.filter(
      (r) => r.status === "fulfilled" && r.value.success,
    );

    console.log(`✅ Bulk delete completed: ${successful.length} successful`);

    return {
      success: successful.length > 0,
      message: `Deleted ${successful.length} threads successfully`,
      count: successful.length,
    };
  } catch (error) {
    console.error("❌ Error in bulk delete:", error);
    throw error;
  }
}

/**
 * Get labels
 */
export async function getLabels() {
  try {
    const gmail = await initializeGmailClient();

    const res = await gmail.users.labels.list({
      userId: "me",
    });

    return res.data.labels || [];
  } catch (error) {
    console.error("❌ Error getting labels:", error);
    throw error;
  }
}

/**
 * Get email suggestions
 */
export async function getEmailSuggestions(query, limit = 10) {
  try {
    const gmail = await initializeGmailClient();

    if (!query || query.length < 2) {
      return [];
    }

    // Search for emails containing the query
    const res = await gmail.users.messages.list({
      userId: "me",
      maxResults: 50,
      q: `from:${query} OR to:${query} OR cc:${query}`,
    });

    const messages = res.data.messages || [];
    const emailSet = new Set();

    // Extract email addresses from recent messages
    for (const message of messages.slice(0, 10)) {
      try {
        const msgRes = await gmail.users.messages.get({
          userId: "me",
          id: message.id,
          format: "metadata",
          metadataHeaders: ["From", "To", "Cc"],
        });

        const headers = msgRes.data.payload?.headers || [];

        // Extract from header
        const fromHeader = headers.find((h) => h.name === "From");
        if (fromHeader?.value) {
          const emails = extractAllEmails(fromHeader.value);
          emails.forEach((email) => emailSet.add(email));
        }

        // Extract to header
        const toHeader = headers.find((h) => h.name === "To");
        if (toHeader?.value) {
          const emails = extractAllEmails(toHeader.value);
          emails.forEach((email) => emailSet.add(email));
        }

        // Extract cc header
        const ccHeader = headers.find((h) => h.name === "Cc");
        if (ccHeader?.value) {
          const emails = extractAllEmails(ccHeader.value);
          emails.forEach((email) => emailSet.add(email));
        }
      } catch (err) {
        console.error(`Error processing message ${message.id}:`, err.message);
      }
    }

    // Also search in sent emails
    const sentRes = await gmail.users.messages.list({
      userId: "me",
      maxResults: 20,
      q: `in:sent ${query}`,
    });

    const sentMessages = sentRes.data.messages || [];

    for (const message of sentMessages.slice(0, 5)) {
      try {
        const msgRes = await gmail.users.messages.get({
          userId: "me",
          id: message.id,
          format: "metadata",
          metadataHeaders: ["To", "Cc"],
        });

        const headers = msgRes.data.payload?.headers || [];

        // Extract to header from sent emails
        const toHeader = headers.find((h) => h.name === "To");
        if (toHeader?.value) {
          const emails = extractAllEmails(toHeader.value);
          emails.forEach((email) => emailSet.add(email));
        }

        // Extract cc header from sent emails
        const ccHeader = headers.find((h) => h.name === "Cc");
        if (ccHeader?.value) {
          const emails = extractAllEmails(ccHeader.value);
          emails.forEach((email) => emailSet.add(email));
        }
      } catch (err) {
        console.error(
          `Error processing sent message ${message.id}:`,
          err.message,
        );
      }
    }

    // Filter by query if provided
    let suggestions = Array.from(emailSet);
    if (query) {
      const lowerQuery = query.toLowerCase();
      suggestions = suggestions.filter((email) =>
        email.toLowerCase().includes(lowerQuery),
      );
    }

    return suggestions.slice(0, limit);
  } catch (error) {
    console.error("❌ Error getting email suggestions:", error);
    return [];
  }
}

/**
 * Watch inbox (uses polling instead of Pub/Sub)
 */
export async function watchInbox() {
  try {
    await initializeGmailClient();
    console.log("🔔 Using polling for real-time updates");
    return { historyId: Date.now().toString() };
  } catch (error) {
    console.error("❌ Error starting inbox watch:", error);
    throw error;
  }
}

/**
 * Stop watch
 */
export async function stopWatch(userId) {
  try {
    const gmail = await initializeGmailClient();

    await gmail.users.stop({
      userId: userId,
    });

    console.log("🔕 Inbox watch stopped");
  } catch (error) {
    console.error("❌ Error stopping inbox watch:", error);
    throw error;
  }
}

/**
 * List all threads (simplified)
 */
export async function listAllThreads() {
  try {
    const gmail = await initializeGmailClient();

    const res = await gmail.users.threads.list({
      userId: "me",
      maxResults: 100,
      q: "in:inbox",
    });

    const threads = res.data.threads || [];
    console.log(`✅ Fetched ${threads.length} threads`);

    const basicThreads = threads.map((thread) => ({
      id: thread.id,
      snippet: thread.snippet,
    }));

    return basicThreads;
  } catch (error) {
    console.error("❌ Error listing all threads:", error);
    throw error;
  }
}

/**
 * Send simple email without attachments
 */
export async function sendEmail(
  to,
  subject,
  message,
  cc = "",
  bcc = "",
  attachments = [],
  files = [],
) {
  if ((attachments && attachments.length > 0) || (files && files.length > 0)) {
    return await sendEmailWithAttachments(
      to,
      subject,
      message,
      cc,
      bcc,
      attachments,
      files,
    );
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

    // Get user's email from token
    const tokenDoc = await GmailToken.findOne({ is_active: true });
    if (!tokenDoc) {
      throw new Error("No active Gmail account found");
    }
    const fromEmail = tokenDoc.email;

    // Construct simple email
    const emailLines = [
      `To: ${to}`,
      `From: ${fromEmail}`,
      `Subject: ${subject || "(No Subject)"}`,
    ];

    const ccList = processEmailList(cc);
    const bccList = processEmailList(bcc);

    if (ccList.length > 0) emailLines.push(`Cc: ${ccList.join(", ")}`);
    if (bccList.length > 0) emailLines.push(`Bcc: ${bccList.join(", ")}`);

    emailLines.push(
      'Content-Type: text/plain; charset="UTF-8"',
      "Content-Transfer-Encoding: quoted-printable",
      "MIME-Version: 1.0",
      "",
      message || "",
    );

    const email = emailLines.join("\r\n");

    // Convert to base64
    const base64Email = Buffer.from(email)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const res = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: base64Email },
    });

    const duration = (Date.now() - startTime) / 1000;
    console.log(`✅ Simple email sent in ${duration.toFixed(2)}s`);

    return {
      success: true,
      ...res.data,
      sendTime: duration,
    };
  } catch (error) {
    console.error("❌ Error sending simple email:", error);
    throw error;
  }
}

// ============= HELPER FUNCTIONS =============

/**
 * Extract content from email parts
 */
function extractContent(parts) {
  if (!parts) return { text: "", html: "", attachments: [] };

  let text = "";
  let html = "";
  const attachments = [];

  function processPart(part, depth = 0) {
    if (!part) return;

    const mimeType = part.mimeType || "";
    const filename = part.filename || "";
    const body = part.body || {};

    // Check if this part is an attachment
    if (filename && body.attachmentId) {
      attachments.push({
        id: body.attachmentId,
        filename: filename,
        mimeType: mimeType,
        size: body.size || 0,
      });
      return;
    }

    // Extract text content
    if (mimeType === "text/plain" && body.data) {
      text = Buffer.from(body.data, "base64").toString("utf-8");
    }
    // Extract HTML content
    else if (mimeType === "text/html" && body.data) {
      html = Buffer.from(body.data, "base64").toString("utf-8");
    }
    // Process nested parts
    else if (part.parts) {
      part.parts.forEach((nestedPart) => processPart(nestedPart, depth + 1));
    }
  }

  if (Array.isArray(parts)) {
    parts.forEach((part) => processPart(part));
  } else {
    processPart(parts);
  }

  return { text, html, attachments };
}

/**
 * Validate email address format
 */
function validateEmailAddress(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * Process email list from string
 */
function processEmailList(emailString) {
  if (!emailString) return [];
  return emailString
    .split(",")
    .map((email) => email.trim())
    .filter((email) => email && validateEmailAddress(email));
}

/**
 * Extract all emails from string
 */
function extractAllEmails(str) {
  if (!str) return [];
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
  const matches = str.match(emailRegex);
  return matches ? matches : [];
}

/**
 * Get all active Gmail accounts
 */
export async function getAllActiveAccounts() {
  try {
    const accounts = await GmailToken.find({ is_active: true }).sort({
      last_connected: -1,
    });
    return accounts.map((account) => ({
      email: account.email,
      last_connected: account.last_connected,
    }));
  } catch (error) {
    console.error("❌ Error getting active accounts:", error);
    return [];
  }
}

/**
 * Switch Gmail account
 */
export async function switchAccount(email) {
  try {
    // Clear current client
    currentGmailClient = null;
    currentUserEmail = null;

    // Initialize with new email
    const gmail = await initializeGmailClient(email);

    return {
      success: true,
      email: email,
      message: `Switched to account: ${email}`,
    };
  } catch (error) {
    console.error("❌ Error switching account:", error);
    throw error;
  }
}

/**
 * Delete a draft
 */
export async function deleteDraft(draftId) {
  try {
    const gmail = await initializeGmailClient();
    await gmail.users.drafts.delete({
      userId: 'me',
      id: draftId,
    });
    console.log(`✅ Draft ${draftId} deleted`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error deleting draft:', error);
    throw error;
  }
}