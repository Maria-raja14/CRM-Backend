import express from "express";
import multer from "multer";
import {
  generateAuthUrl,
  exchangeCodeForTokens,
  listThreads,
  listAllThreads,
  getThread,
  checkAuth,
  sendEmail,
  sendEmailWithAttachments,
  deleteEmail,
  deleteThread,
  getAttachment,
  watchInbox,
  stopWatch,
  markAsRead,
  starThread,
  bulkStarThreads,
  markAsSpam,
  markAsImportant,
  moveToTrash,
  bulkMoveToTrash,
  bulkDeleteThreads,
  getLabels,
  applyLabel,
  saveDraft,
  getDrafts,
  getEmailSuggestions,
  initializeGmailClient,
  getLabelCounts, // ✅ NEW

} from "../utils/gmailService.js";

const router = express.Router();

// ✅ Frontend URL
const FRONTEND_URL = process.env.NODE_ENV === 'production' 
  ? process.env.FRONTEND_URL_LIVE || "https://crm.stagingzar.com"
  : process.env.FRONTEND_URL_LOCAL || "http://localhost:5173";

console.log(`📧 Gmail routes using frontend URL: ${FRONTEND_URL}`);

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 30 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) => cb(null, true),
});

// ============= OPTIMIZED ENDPOINTS =============


router.get("/all-counts", async (req, res) => {
  try {
    const counts = await getLabelCounts();
    res.json({ success: true, counts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});



/**
 * ✅ OPTIMIZED: Get threads with caching headers
 */
router.get("/threads", async (req, res) => {
  try {
    const maxResults = parseInt(req.query.maxResults) || 20;
    const pageToken = req.query.pageToken || null;
    const label = req.query.label || "INBOX";
    const countOnly = req.query.countOnly === 'true';

    // If countOnly is true, return just the count
    if (countOnly) {
      const result = await listThreads(1, null, label);
      return res.json({
        success: true,
        totalEstimate: result.resultSizeEstimate || 0,
        label
      });
    }

    const result = await listThreads(maxResults, pageToken, label);
    
    // Add cache headers
    res.set('Cache-Control', 'private, max-age=60'); // 60 seconds cache
    
    res.json({
      success: true,
      data: result.threads,
      nextPageToken: result.nextPageToken,
      totalEstimate: result.resultSizeEstimate,
      label: label,
    });
  } catch (err) {
    console.error("Error fetching threads:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * ✅ OPTIMIZED: Get drafts count
 */
router.get("/drafts/count", async (req, res) => {
  try {
    const gmail = await initializeGmailClient();
    const drafts = await getDrafts(1);
    res.json({
      success: true,
      count: drafts.length || 0
    });
  } catch (err) {
    console.error("Error getting drafts count:", err);
    res.json({ success: true, count: 0 });
  }
});

// ============= REST OF YOUR EXISTING ROUTES =============

// 1️⃣ Get Google OAuth URL
router.get("/auth-url", (req, res) => {
  try {
    console.log("🔗 Generating auth URL...");
    const authUrl = generateAuthUrl();
    res.json({ success: true, url: authUrl });
  } catch (error) {
    console.error("❌ Error generating auth URL:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2️⃣ Check authentication status
router.get("/auth-status", async (req, res) => {
  try {
    const authStatus = await checkAuth();
    res.json(authStatus);
  } catch (error) {
    console.error("Error checking auth status:", error);
    res.status(500).json({
      authenticated: false,
      message: "Error checking authentication status",
    });
  }
});

// 3️⃣ OAuth2 callback
router.get("/oauth2callback", async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    console.error("OAuth error:", error);
    const msg = error === "access_denied"
      ? "App not verified. Please contact the developer or check Google Cloud Console settings."
      : "Authorization failed.";
    return res.redirect(
      `${FRONTEND_URL}/emailchat?gmail_error=1&error=${encodeURIComponent(msg)}`,
    );
  }

  if (!code) {
    return res.redirect(
      `${FRONTEND_URL}/emailchat?gmail_error=1&error=No authorization code received`,
    );
  }

  try {
    console.log("🔄 Exchanging authorization code for tokens...");
    await exchangeCodeForTokens(code);
    console.log("✅ Gmail connected successfully");
    res.redirect(`${FRONTEND_URL}/emailchat?gmail_connected=1`);
  } catch (err) {
    console.error("❌ OAuth failed:", err);
    let msg = err.message;
    if (err.message.includes("verification"))
      msg = "App verification required. Please ensure app is published or you're added as test user.";
    else if (err.message.includes("invalid_grant"))
      msg = "Authorization code expired or already used. Please reconnect Gmail.";
    res.redirect(
      `${FRONTEND_URL}/emailchat?gmail_error=1&error=${encodeURIComponent(msg)}`,
    );
  }
});

// 4️⃣ Get all threads
router.get("/all-threads", async (req, res) => {
  try {
    console.log("🔄 Fetching all threads...");
    const threads = await listAllThreads();
    res.json({ success: true, data: threads });
  } catch (err) {
    console.error("Error fetching all threads:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5️⃣ Get single thread with full content
router.get("/thread/:id", async (req, res) => {
  try {
    const thread = await getThread(req.params.id);
    res.json({ success: true, data: thread });
  } catch (err) {
    console.error("Error fetching thread:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6️⃣ Get attachment
router.get("/attachment/:messageId/:attachmentId", async (req, res) => {
  try {
    const { messageId, attachmentId } = req.params;
    const attachment = await getAttachment(messageId, attachmentId);
    res.json({ success: true, data: attachment });
  } catch (err) {
    console.error("Error fetching attachment:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});




// ============= SEND EMAIL - COMPLETELY FIXED =============



router.post("/send", upload.array("attachments", 10), async (req, res) => {
  try {
    console.log("📧 Send email request received");
    console.log("Request body:", req.body);
    console.log("Files received:", req.files?.length || 0);

    const { to, cc, bcc, subject, message } = req.body;

    // Validate required fields
    if (!to) {
      return res.status(400).json({
        success: false,
        error: "Recipient email address is required",
      });
    }

    if (!to.includes('@')) {
      return res.status(400).json({
        success: false,
        error: "Invalid email address format",
      });
    }

    // Process attachments - THIS IS THE CRITICAL FIX
    const attachments = [];
    if (req.files && req.files.length > 0) {
      console.log(`📎 Processing ${req.files.length} attachments...`);
      
      for (const file of req.files) {
        try {
          // Validate file size (25MB Gmail limit)
          if (file.size > 25 * 1024 * 1024) {
            throw new Error(`File ${file.originalname} exceeds 25MB limit`);
          }
          
          attachments.push({
            filename: file.originalname,
            content: file.buffer.toString('base64'),
            mimetype: file.mimetype,
            size: file.size
          });
          
          console.log(`✅ Processed: ${file.originalname} (${file.size} bytes)`);
        } catch (fileErr) {
          console.error(`❌ Error processing file ${file.originalname}:`, fileErr);
          return res.status(400).json({
            success: false,
            error: fileErr.message
          });
        }
      }
    }

    console.log(`📧 Sending email to: ${to}`);
    console.log(`📧 Subject: ${subject || '(No Subject)'}`);
    console.log(`📧 Attachments: ${attachments.length}`);

    // CRITICAL FIX: Pass attachments correctly - 6th parameter
    const result = await sendEmailWithAttachments(
      to,                          // 1. to
      subject || '(No Subject)',   // 2. subject
      message || '',              // 3. message
      cc || '',                   // 4. cc
      bcc || '',                  // 5. bcc
      attachments,               // 6. attachments - THIS WAS MISSING!
      []                         // 7. files (empty array)
    );

    console.log("✅ Email sent successfully:", result.id);
    
    res.json({
      success: true,
      data: {
        id: result.id,
        threadId: result.threadId,
        labelIds: result.labelIds
      },
      message: `Email sent successfully${attachments.length ? ` with ${attachments.length} attachment(s)` : ''}`,
      sendTime: result.sendTime
    });

  } catch (err) {
    console.error("❌ Error sending email:", err);
    
    let errorMessage = err.message;
    let statusCode = 500;
    
    if (err.message.includes('Invalid recipient')) {
      statusCode = 400;
      errorMessage = "Invalid recipient email address";
    } else if (err.message.includes('exceeds limit')) {
      statusCode = 400;
      errorMessage = "Email size exceeds Gmail's 25MB limit";
    } else if (err.message.includes('authentication')) {
      statusCode = 401;
      errorMessage = "Gmail authentication failed. Please reconnect.";
    } else if (err.message.includes('quota')) {
      statusCode = 429;
      errorMessage = "Gmail sending quota exceeded. Please try again later.";
    }
    
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      details: err.response?.data || null
    });
  }
});

// 8️⃣ Get email suggestions
router.get("/suggestions", async (req, res) => {
  try {
    const { query } = req.query;
    const suggestions = await getEmailSuggestions(query || "", 10);
    res.json({ success: true, data: suggestions });
  } catch (err) {
    console.error("Error getting suggestions:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9️⃣ Delete email
router.delete("/message/:id", async (req, res) => {
  try {
    await deleteEmail(req.params.id);
    res.json({ success: true, message: "Email deleted successfully" });
  } catch (err) {
    console.error("Error deleting email:", err);
    if (err.message.includes("insufficientPermissions")) {
      return res.status(403).json({
        success: false,
        error: "Insufficient permissions. Please reconnect Gmail with proper permissions.",
      });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// 🔟 Delete thread
router.delete("/thread/:id", async (req, res) => {
  try {
    await deleteThread(req.params.id);
    res.json({ success: true, message: "Thread deleted successfully" });
  } catch (err) {
    console.error("Error deleting thread:", err);
    if (err.message.includes("insufficientPermissions")) {
      return res.status(403).json({
        success: false,
        error: "Insufficient permissions. Please reconnect Gmail with proper permissions.",
      });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// 1️⃣1️⃣ Bulk delete threads
router.post("/bulk-delete", async (req, res) => {
  try {
    const { threadIds, permanent = false } = req.body;

    if (!threadIds || !Array.isArray(threadIds) || threadIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No thread IDs provided",
      });
    }

    let result;
    if (permanent) {
      result = await bulkDeleteThreads(threadIds);
    } else {
      result = await bulkMoveToTrash(threadIds);
    }

    res.json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (err) {
    console.error("Error in bulk delete:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 1️⃣2️⃣ Mark as read/unread
router.post("/thread/:id/read", async (req, res) => {
  try {
    const { read } = req.body;
    await markAsRead(req.params.id, read !== false);
    res.json({
      success: true,
      message: `Thread marked as ${read !== false ? "read" : "unread"}`,
    });
  } catch (err) {
    console.error("Error marking thread:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});//old one



// 1️⃣3️⃣ Star/unstar thread
router.post("/thread/:id/star", async (req, res) => {
  try {
    const { star } = req.body;
    await starThread(req.params.id, star !== false);
    res.json({
      success: true,
      message: `Thread ${star !== false ? "starred" : "unstarred"}`,
    });
  } catch (err) {
    console.error("Error starring thread:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 1️⃣4️⃣ Bulk star/unstar threads
router.post("/bulk-star", async (req, res) => {
  try {
    const { threadIds, star } = req.body;

    if (!threadIds || !Array.isArray(threadIds) || threadIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No thread IDs provided",
      });
    }

    const result = await bulkStarThreads(threadIds, star !== false);

    res.json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (err) {
    console.error("Error in bulk star:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 1️⃣5️⃣ Mark as spam
router.post("/thread/:id/spam", async (req, res) => {
  try {
    const { spam } = req.body;
    await markAsSpam(req.params.id, spam !== false);
    res.json({
      success: true,
      message: `Thread ${spam !== false ? "marked as spam" : "removed from spam"}`,
    });
  } catch (err) {
    console.error("Error marking as spam:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 1️⃣6️⃣ Mark as important
router.post("/thread/:id/important", async (req, res) => {
  try {
    const { important } = req.body;
    await markAsImportant(req.params.id, important !== false);
    res.json({
      success: true,
      message: `Thread ${important !== false ? "marked as important" : "removed from important"}`,
    });
  } catch (err) {
    console.error("Error marking as important:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 1️⃣7️⃣ Move to trash
router.post("/thread/:id/trash", async (req, res) => {
  try {
    await moveToTrash(req.params.id);
    res.json({
      success: true,
      message: "Thread moved to trash",
    });
  } catch (err) {
    console.error("Error moving to trash:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});//old one






// 1️⃣8️⃣ Get labels
router.get("/labels", async (req, res) => {
  try {
    const labels = await getLabels();
    res.json({ success: true, data: labels });
  } catch (err) {
    console.error("Error getting labels:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 1️⃣9️⃣ Apply label
router.post("/thread/:id/label", async (req, res) => {
  try {
    const { labelId } = req.body;
    await applyLabel(req.params.id, labelId);
    res.json({
      success: true,
      message: "Label applied successfully",
    });
  } catch (err) {
    console.error("Error applying label:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});//old one




// ============= SAVE DRAFT - FIXED =============
router.post("/draft", upload.array("attachments", 10), async (req, res) => {
  try {
    console.log("📝 Save draft request received");
    const { to, cc, bcc, subject, message } = req.body;

    if (!to) {
      return res.status(400).json({
        success: false,
        error: "Recipient email address is required",
      });
    }

    // Process attachments
    const attachments = [];
    if (req.files && req.files.length > 0) {
      console.log(`📎 Processing ${req.files.length} attachments for draft...`);
      for (const file of req.files) {
        attachments.push({
          filename: file.originalname,
          content: file.buffer.toString('base64'),
          mimetype: file.mimetype,
          size: file.size
        });
      }
    }

    // CRITICAL FIX: Pass attachments correctly
    const result = await saveDraft(
      to,
      subject || '(No Subject)',
      message || '',
      cc || '',
      bcc || '',
      attachments,
      [] // files array
    );
    
    console.log("✅ Draft saved successfully:", result.id);
    
    res.json({ 
      success: true, 
      data: result,
      message: "Draft saved successfully" 
    });
    
  } catch (err) {
    console.error("❌ Error saving draft:", err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// 2️⃣1️⃣ Get drafts
router.get("/drafts", async (req, res) => {
  try {
    const maxResults = parseInt(req.query.maxResults) || 20;
    const drafts = await getDrafts(maxResults);
    res.json({ 
      success: true, 
      data: drafts,
      totalCount: drafts.length 
    });
  } catch (err) {
    console.error("Error getting drafts:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 🔐 Disconnect Gmail
router.delete("/disconnect", async (req, res) => {
  try {
    const fs = await import("fs/promises");
    const path = await import("path");
    const { fileURLToPath } = await import("url");
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const TOKEN_PATH = path.join(__dirname, "..", "tokens.json");
    await fs.unlink(TOKEN_PATH).catch(() => console.log("No token file to delete"));

    res.json({ success: true, message: "Gmail disconnected successfully" });
  } catch (err) {
    console.error("Error disconnecting Gmail:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 📨 Start real-time inbox watching
router.post("/watch", async (req, res) => {
  try {
    const watchResult = await watchInbox();
    res.json({
      success: true,
      message: "Real-time inbox watching started",
      historyId: watchResult.historyId,
    });
  } catch (err) {
    console.error("Error starting inbox watch:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 🛑 Stop real-time inbox watching
router.post("/stop-watch", async (req, res) => {
  try {
    await stopWatch("me");
    res.json({ success: true, message: "Real-time watching stopped" });
  } catch (err) {
    console.error("Error stopping inbox watch:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Test route
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Gmail routes working fine ✅",
    timestamp: new Date().toISOString(),
  });
});





export default router;//come correctly



