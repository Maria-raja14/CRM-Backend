// app.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import fs from "fs";
import jwt from "jsonwebtoken";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import rateLimit from "express-rate-limit";

// DB & Routes
import connectDB from "./config/db.js";
import routes from "./routes/index.routes.js";
import fileRoutes from "./routes/files.routes.js";
import callLogRoutes from "./routes/callLog.routes.js";
import botRoutes from "./routes/bot.routes.js";
import emailRoutes from "./routes/email.routes.js";
import templateRoutes from "./routes/emailTemplate.routes.js";
import publicRoutes from "./routes/public.routes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import lostDealRoutes from "./routes/lostDealRoutes.js";
import clientLTVRoutes from "./routes/clientLTVRoutes.js";
import notificationRoutes from "./routes/notification.routes.js";
// Socket & Cron
import { initSocket } from "./realtime/socket.js";

// ✅ Import cron controllers directly
import followupsCronController from './controllers/proposalFollowUpCron.controller.js';
import dealFollowupController from './controllers/dealFollowup.cron.js';
import activityReminderController from './controllers/activityReminder.cron.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
// Security & Sanitization
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);
app.use(mongoSanitize());

// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', globalLimiter);
app.use(globalLimiter);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);
app.use(mongoSanitize());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "public")));

// JWT Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Not authorized, no token" });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Token is not valid" });
    req.user = user;
    next();
  });
};

// Mount API routes
app.use("/api", routes);
app.use("/api/files", fileRoutes);
app.use("/api/deals", lostDealRoutes);
app.use("/api/cltv", clientLTVRoutes);
app.use("/api/calllogs", callLogRoutes);
app.use("/api/bot", botRoutes);
app.use("/api/email", emailRoutes);
app.use("/api/email-templates", templateRoutes);
app.use("/api", publicRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/notification", notificationRoutes);
// Protected file download
app.get("/api/files/download", authenticateToken, (req, res) => {
  try {
    const { filePath } = req.query;
    if (!filePath) return res.status(400).json({ message: "File path is required" });

    const fullPath = path.join(__dirname, filePath);
    const uploadsDir = path.join(__dirname, "uploads");

    if (!fullPath.startsWith(uploadsDir)) return res.status(403).json({ message: "Access denied" });
    if (!fs.existsSync(fullPath)) return res.status(404).json({ message: "File not found" });

    const fileName = path.basename(fullPath);
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Type", "application/octet-stream");

    fs.createReadStream(fullPath).pipe(res);
  } catch (error) {
    console.error("File download error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// 404 & error handlers
app.use((req, res) => res.status(404).json({ message: "Route not found" }));
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Server Error" });
});

// HTTP server + Socket.IO
const server = http.createServer(app);
initSocket(server);

// ====================
// ✅ Start Cron Jobs
// ====================
followupsCronController.startProposalFollowUpCron();
activityReminderController.startActivityReminderCron(); // If moved here
dealFollowupController.startDealFollowUpCron();

// ====================
// Start server
// ====================
const PORT = process.env.PORT || 5000;
const startServer = async () => {
  try {
    await connectDB();
    server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();