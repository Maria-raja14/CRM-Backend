

import express from "express";
import multer from "multer";
import {
  generateAuthUrl,
  exchangeCodeForTokens,
  listThreads,
  listAllThreads,
  getThread,
  checkAuth,
  sendEmailWithAttachments,
  deleteEmail,
  deleteThread,
  getAttachment,
  watchInbox,
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
  getDraft,
  getEmailSuggestions,
  getLabelCounts,
  disconnectGmail,
  getAllActiveAccounts,
  deleteDraft,
} from "../utils/gmailService.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 10 },
  fileFilter: (_req, _file, cb) => cb(null, true),
});

// Helper: get email from request
function getEmail(req) {
  return (
    req.body?.email || req.query?.email || req.headers["x-gmail-email"] || null
  );
}

function requireEmail(req, res) {
  const email = getEmail(req);
  if (!email) {
    res
      .status(400)
      .json({ success: false, message: "Missing required parameter: email" });
    return null;
  }
  return email;
}

// ═══════════════════════════════════════
// ACCOUNTS
// ═══════════════════════════════════════
router.get("/accounts", async (req, res) => {
  try {
    const accounts = await getAllActiveAccounts();
    res.json({ success: true, accounts, current: accounts[0] || null });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════
// COUNTS
// ═══════════════════════════════════════
router.get("/all-counts", async (req, res) => {
  try {
    const email = requireEmail(req, res);
    if (!email) return;
    const counts = await getLabelCounts(email);
    res.json({ success: true, counts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════
// THREADS
// ═══════════════════════════════════════
router.get("/threads", async (req, res) => {
  try {
    const email = requireEmail(req, res);
    if (!email) return;
    const maxResults = parseInt(req.query.maxResults) || 20;
    const pageToken = req.query.pageToken || null;
    const label = req.query.label || "INBOX";
    const result = await listThreads(maxResults, pageToken, label, email);
    res.set("Cache-Control", "private, max-age=30");
    res.json({
      success: true,
      data: result.threads,
      nextPageToken: result.nextPageToken,
      totalEstimate: result.resultSizeEstimate,
      label,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/all-threads", async (req, res) => {
  try {
    const email = requireEmail(req, res);
    if (!email) return;
    const threads = await listAllThreads(email);
    res.json({ success: true, data: threads });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/thread/:id", async (req, res) => {
  try {
    const email = requireEmail(req, res);
    if (!email) return;
    const thread = await getThread(req.params.id, email);
    res.json({ success: true, data: thread });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete("/thread/:id", async (req, res) => {
  try {
    const email = requireEmail(req, res);
    if (!email) return;
    await deleteThread(req.params.id, email);
    res.json({ success: true, message: "Thread deleted" });
  } catch (err) {
    if (err.message?.includes("insufficientPermissions"))
      return res
        .status(403)
        .json({
          success: false,
          error: "Insufficient permissions. Please reconnect Gmail.",
        });
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/thread/:id/read", async (req, res) => {
  try {
    const email = requireEmail(req, res);
    if (!email) return;
    await markAsRead(req.params.id, req.body.read !== false, email);
    res.json({
      success: true,
      message: `Marked as ${req.body.read !== false ? "read" : "unread"}`,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/thread/:id/star", async (req, res) => {
  try {
    const email = requireEmail(req, res);
    if (!email) return;
    await starThread(req.params.id, req.body.star !== false, email);
    res.json({
      success: true,
      message: `Thread ${req.body.star !== false ? "starred" : "unstarred"}`,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/thread/:id/spam", async (req, res) => {
  try {
    const email = requireEmail(req, res);
    if (!email) return;
    await markAsSpam(req.params.id, req.body.spam !== false, email);
    res.json({ success: true, message: "Spam status updated" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/thread/:id/important", async (req, res) => {
  try {
    const email = requireEmail(req, res);
    if (!email) return;
    await markAsImportant(req.params.id, req.body.important !== false, email);
    res.json({ success: true, message: "Important status updated" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/thread/:id/trash", async (req, res) => {
  try {
    const email = requireEmail(req, res);
    if (!email) return;
    await moveToTrash(req.params.id, email);
    res.json({ success: true, message: "Thread moved to trash" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/thread/:id/label", async (req, res) => {
  try {
    const email = requireEmail(req, res);
    if (!email) return;
    await applyLabel(req.params.id, req.body.labelId, email);
    res.json({ success: true, message: "Label applied" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════
// BULK
// ═══════════════════════════════════════
router.post("/bulk-delete", async (req, res) => {
  try {
    const email = requireEmail(req, res);
    if (!email) return;
    const { threadIds, permanent = false } = req.body;
    if (!threadIds?.length)
      return res.status(400).json({ success: false, error: "No thread IDs" });
    const result = permanent
      ? await bulkDeleteThreads(threadIds, email)
      : await bulkMoveToTrash(threadIds, email);
    res.json({ success: true, message: result.message, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/bulk-star", async (req, res) => {
  try {
    const email = requireEmail(req, res);
    if (!email) return;
    const { threadIds, star } = req.body;
    if (!threadIds?.length)
      return res.status(400).json({ success: false, error: "No thread IDs" });
    const result = await bulkStarThreads(threadIds, star !== false, email);
    res.json({ success: true, message: result.message, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/bulk-trash", async (req, res) => {
  try {
    const email = requireEmail(req, res);
    if (!email) return;
    const { threadIds } = req.body;
    if (!threadIds?.length)
      return res.status(400).json({ success: false, error: "No thread IDs" });
    const result = await bulkMoveToTrash(threadIds, email);
    res.json({ success: true, message: result.message, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════
// SEND
// ═══════════════════════════════════════
router.post("/send", upload.array("attachments", 10), async (req, res) => {
  try {
    const email = requireEmail(req, res);
    if (!email) return;
    const { to, cc, bcc, subject, message } = req.body;
    if (!to)
      return res
        .status(400)
        .json({ success: false, error: "Recipient required" });

    const attachments = [];
    for (const file of req.files || []) {
      if (file.size > 25 * 1024 * 1024)
        return res
          .status(400)
          .json({
            success: false,
            error: `"${file.originalname}" exceeds 25MB`,
          });
      attachments.push({
        filename: file.originalname,
        content: file.buffer.toString("base64"),
        mimetype: file.mimetype,
        size: file.size,
      });
    }

    const result = await sendEmailWithAttachments(
      to,
      subject || "(No Subject)",
      message || "",
      cc || "",
      bcc || "",
      attachments,
      [],
      email,
    );
    res.json({
      success: true,
      data: { id: result.id, threadId: result.threadId },
      message: "Email sent!",
      sendTime: result.sendTime,
    });
  } catch (err) {
    let statusCode = 500;
    if (
      err.message?.includes("Invalid recipient") ||
      err.message?.includes("25MB")
    )
      statusCode = 400;
    else if (err.message?.includes("auth")) statusCode = 401;
    res.status(statusCode).json({ success: false, error: err.message });
  }
});

router.delete("/message/:id", async (req, res) => {
  try {
    const email = requireEmail(req, res);
    if (!email) return;
    await deleteEmail(req.params.id, email);
    res.json({ success: true, message: "Email deleted" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════
// DRAFTS
// ═══════════════════════════════════════
router.post("/draft", upload.array("attachments", 10), async (req, res) => {
  try {
    const email = requireEmail(req, res);
    if (!email) return;
    const { to, cc, bcc, subject, message } = req.body;
    if (!to)
      return res
        .status(400)
        .json({ success: false, error: "Recipient required" });
    const attachments = (req.files || []).map((f) => ({
      filename: f.originalname,
      content: f.buffer.toString("base64"),
      mimetype: f.mimetype,
      size: f.size,
    }));
    const result = await saveDraft(
      to,
      subject || "(No Subject)",
      message || "",
      cc || "",
      bcc || "",
      attachments,
      [],
      email,
    );
    res.json({ success: true, data: result, message: "Draft saved" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/drafts", async (req, res) => {
  try {
    const email = requireEmail(req, res);
    if (!email) return;
    const drafts = await getDrafts(parseInt(req.query.maxResults) || 20, email);
    res.json({ success: true, data: drafts, totalCount: drafts.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/drafts/count", async (req, res) => {
  try {
    const email = requireEmail(req, res);
    if (!email) return;
    const drafts = await getDrafts(100, email);
    res.json({ success: true, count: drafts.length });
  } catch {
    res.json({ success: true, count: 0 });
  }
});

router.get("/draft/:draftId", async (req, res) => {
  try {
    const email = requireEmail(req, res);
    if (!email) return;
    const draft = await getDraft(req.params.draftId, email);
    res.json({ success: true, data: draft });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete("/draft/:id", async (req, res) => {
  try {
    const email = requireEmail(req, res);
    if (!email) return;
    await deleteDraft(req.params.id, email);
    res.json({ success: true, message: "Draft deleted" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════
// ATTACHMENTS
// ═══════════════════════════════════════
router.get("/attachment/:messageId/:attachmentId", async (req, res) => {
  try {
    const email = requireEmail(req, res);
    if (!email) return;
    const attachment = await getAttachment(
      req.params.messageId,
      req.params.attachmentId,
      email,
    );
    res.json({ success: true, data: attachment });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════
// AUTH
// ═══════════════════════════════════════
router.get("/auth-url", (req, res) => {
  try {
    const host = req.get("host");
    const redirectUri =
      host?.includes("localhost") || host?.includes("127.0.0.1")
        ? process.env.GMAIL_REDIRECT_URI
        : process.env.GMAIL_LIVE_REDIRECT_URI;
    res.json({ success: true, url: generateAuthUrl(redirectUri) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/auth-status", async (req, res) => {
  try {
    const email = req.query.email || null;
    const status = await checkAuth(email);
    res.json(status);
  } catch {
    res
      .status(500)
      .json({ authenticated: false, message: "Error checking auth" });
  }
});

router.get("/oauth2callback", async (req, res) => {
  const { code, error } = req.query;
  const host = req.get("host");
  const isLocal = host?.includes("localhost") || host?.includes("127.0.0.1");
  const frontendUrl = isLocal
    ? process.env.FRONTEND_URL_LOCAL || "http://localhost:5173"
    : process.env.FRONTEND_URL_LIVE || "https://crm.stagingzar.com";
  const redirectUri = isLocal
    ? process.env.GMAIL_REDIRECT_URI
    : process.env.GMAIL_LIVE_REDIRECT_URI;

  if (error) {
    const msg =
      error === "access_denied" ? "App not verified." : "Authorization failed.";
    return res.redirect(
      `${frontendUrl}/emailchat?gmail_error=1&error=${encodeURIComponent(msg)}`,
    );
  }
  if (!code)
    return res.redirect(
      `${frontendUrl}/emailchat?gmail_error=1&error=No authorization code`,
    );

  try {
    const result = await exchangeCodeForTokens(code, redirectUri);
    res.redirect(
      `${frontendUrl}/emailchat?gmail_connected=1&email=${encodeURIComponent(result.email)}`,
    );
  } catch (err) {
    let msg = err.message;
    if (err.message?.includes("invalid_grant"))
      msg = "Authorization code expired. Please reconnect.";
    res.redirect(
      `${frontendUrl}/emailchat?gmail_error=1&error=${encodeURIComponent(msg)}`,
    );
  }
});

router.delete("/disconnect", async (req, res) => {
  try {
    const email = requireEmail(req, res);
    if (!email) return;
    const result = await disconnectGmail(email);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════
// LABELS & SUGGESTIONS
// ═══════════════════════════════════════
router.get("/labels", async (req, res) => {
  try {
    const email = requireEmail(req, res);
    if (!email) return;
    const labels = await getLabels(email);
    res.json({ success: true, data: labels });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/suggestions", async (req, res) => {
  try {
    const email = requireEmail(req, res);
    if (!email) return;
    const suggestions = await getEmailSuggestions(
      req.query.query || "",
      10,
      email,
    );
    res.json({ success: true, data: suggestions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════
// UTILITY
// ═══════════════════════════════════════
router.post("/watch", async (req, res) => {
  try {
    const email = requireEmail(req, res);
    if (!email) return;
    const result = await watchInbox(email);
    res.json({ success: true, historyId: result.historyId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete("/clear-cache", (req, res) =>
  res.json({ success: true, message: "Cache cleared" }),
);
router.get("/test", (req, res) =>
  res.json({
    success: true,
    message: "Gmail routes OK ✅",
    timestamp: new Date().toISOString(),
  }),
);

export default router;