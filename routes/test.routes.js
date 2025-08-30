// routes/test.routes.js
import express from "express";
import { sendNotification } from "../services/notificationService.js";

const router = express.Router();

router.get("/test/:userId", async (req, res) => {
  await sendNotification(
    req.params.userId,
    "🔔 Test notification from server",
    "followup",
    { test: true }
  );
  res.json({ ok: true });
});

export default router;
