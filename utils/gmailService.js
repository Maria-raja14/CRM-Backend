import { google } from "googleapis";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables first
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Debug: Check if environment variables are loaded
console.log("GMAIL_CLIENT_ID exists:", !!process.env.GMAIL_CLIENT_ID);
console.log("GMAIL_CLIENT_SECRET exists:", !!process.env.GMAIL_CLIENT_SECRET);

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REDIRECT_URI =
  process.env.GMAIL_REDIRECT_URI ||
  "http://localhost:5000/api/gmail/oauth2callback";

// Validate required environment variables
if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    "❌ Missing Gmail OAuth credentials. Please check your .env file"
  );
  console.error("CLIENT_ID:", CLIENT_ID ? "Set" : "Missing");
  console.error("CLIENT_SECRET:", CLIENT_SECRET ? "Set" : "Missing");
}

export const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const TOKEN_PATH = path.join(__dirname, "..", "tokens.json");

export function generateAuthUrl() {
  // Validate credentials before generating URL
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error(
      "Gmail OAuth credentials not configured. Please check your environment variables."
    );
  }

  const scopes = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.modify",
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
    await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens, null, 2));
    oauth2Client.setCredentials(tokens);
    console.log("✅ Tokens saved successfully");
    return true;
  } catch (error) {
    console.error("❌ Error saving tokens:", error);
    return false;
  }
}

export async function loadTokens() {
  try {
    const raw = await fs.readFile(TOKEN_PATH, "utf8");
    const tokens = JSON.parse(raw);

    // Check if token is expired and refresh if needed
    if (tokens.expiry_date && Date.now() > tokens.expiry_date) {
      console.log("🔄 Token expired, refreshing...");
      oauth2Client.setCredentials(tokens);
      const { credentials } = await oauth2Client.refreshAccessToken();
      await saveTokens(credentials);
      return credentials;
    }

    oauth2Client.setCredentials(tokens);
    console.log("✅ Tokens loaded successfully");
    return tokens;
  } catch (err) {
    console.log("❌ No tokens found or error loading:", err.message);
    return null;
  }
}

export async function exchangeCodeForTokens(code) {
  try {
    console.log("🔄 Exchanging code for tokens...");
    const { tokens } = await oauth2Client.getToken(code);
    console.log("✅ Received tokens from Google");
    await saveTokens(tokens);
    return tokens;
  } catch (error) {
    console.error("❌ Error exchanging code for tokens:", error);
    throw new Error(`Failed to exchange code for tokens: ${error.message}`);
  }
}

export async function checkAuth() {
  try {
    const tokens = await loadTokens();
    if (!tokens || !tokens.access_token) {
      return {
        authenticated: false,
        message: "No Gmail tokens found. Connect Gmail first.",
      };
    }

    // Test the token by making a simple API call
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    await gmail.users.getProfile({ userId: "me" });

    return { authenticated: true, message: "Gmail is connected" };
  } catch (error) {
    console.error("❌ Auth check failed:", error);
    return {
      authenticated: false,
      message: "Authentication failed. Please reconnect Gmail.",
    };
  }
}

export async function listThreads(maxResults = 20) {
  try {
    const tokens = await loadTokens();
    if (!tokens || !tokens.access_token) {
      throw new Error("No Gmail tokens found. Connect Gmail first.");
    }

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    const res = await gmail.users.threads.list({
      userId: "me",
      maxResults,
    });

    console.log(`✅ Fetched ${res.data.threads?.length || 0} threads`);
    return res.data.threads || [];
  } catch (error) {
    console.error("❌ Error listing threads:", error);
    throw error;
  }
}

export async function getThread(threadId) {
  try {
    const tokens = await loadTokens();
    if (!tokens || !tokens.access_token) {
      throw new Error("No Gmail tokens found. Connect Gmail first.");
    }

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    const res = await gmail.users.threads.get({
      userId: "me",
      id: threadId,
    });

    console.log(`✅ Fetched thread ${threadId}`);
    return res.data;
  } catch (error) {
    console.error("❌ Error getting thread:", error);
    throw error;
  }
}