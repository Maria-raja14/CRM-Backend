// import express from "express";
// import dotenv from "dotenv";
// import cors from "cors";
// import path from "path";
// import { fileURLToPath } from "url";
// import http from "http";
// import fs from "fs";

// import connectDB from "./config/db.js";
// import routes from "./routes/index.routes.js";
// import fileRoutes from "./routes/files.routes.js";        // ✅ handles /api/files/download & /api/files/preview
// import { initSocket } from "./realtime/socket.js";
// import { startFollowUpCron } from "./controllers/followups.cron.js";
// import { startActivityReminderCron } from "./controllers/activityReminder.cron.js";
// import { startProposalFollowUpCron } from "./controllers/proposalFollowUpCron.controller.js";
// import gmailRoutes from "./routes/gmailRoutes.js";
// import googleAuthRoutes from "./routes/googleAuthRoutes.js";
// import whatsappRoutes from "./routes/whatsapp.routes.js";
// import salesRoutes from "./routes/salesReports.routes.js";

// dotenv.config();

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// const app = express();

// // ─────────────────────────────────────────────
// // CORS
// // ─────────────────────────────────────────────
// const corsOptions = {
//   origin: [
//     process.env.FRONTEND_URL || "http://localhost:5173",
//     "https://crm.stagingzar.com",
//     "http://localhost:3000",
//   ],
//   credentials: true,
//   methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
//   allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
// };

// app.use(cors(corsOptions));
// app.options("*", cors(corsOptions)); // preflight

// // ─────────────────────────────────────────────
// // Body parsers
// // ─────────────────────────────────────────────
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // ─────────────────────────────────────────────
// // Static files
// // ─────────────────────────────────────────────
// // NOTE: uploads are served statically ONLY for non-sensitive files.
// // Sensitive downloads/previews go through the authenticated /api/files/* routes.
// app.use("/uploads", express.static(path.join(__dirname, "uploads")));
// app.use(express.static(path.join(__dirname, "public")));

// // ─────────────────────────────────────────────
// // API Routes
// // ─────────────────────────────────────────────
// app.use("/api", routes);

// // ✅ File routes — handles BOTH /api/files/download and /api/files/preview
// // IMPORTANT: register BEFORE the catch-all and BEFORE any duplicate handlers
// app.use("/api/files", fileRoutes);

// app.use("/api/sales", salesRoutes);
// app.use("/api/gmail", gmailRoutes);
// app.use("/api/google-auth", googleAuthRoutes);
// app.use("/api/whatsapp", whatsappRoutes);

// // Legacy Google callback redirect
// app.get("/api/auth/google/callback", (req, res) => {
//   const redirectUrl = `/api/google-auth/auth/google/callback?${new URLSearchParams(
//     req.query
//   ).toString()}`;
//   res.redirect(redirectUrl);
// });

// // ─────────────────────────────────────────────
// // Health check
// // ─────────────────────────────────────────────
// app.get("/api/health", (req, res) => {
//   res.json({
//     status: "OK",
//     timestamp: new Date().toISOString(),
//     service: "CRM Server",
//   });
// });

// // ─────────────────────────────────────────────
// // 404 catch-all
// // ─────────────────────────────────────────────
// app.use((req, res) => {
//   console.log(`❌ Route not found: ${req.method} ${req.url}`);
//   res.status(404).json({
//     message: "Route not found",
//     path: req.url,
//     method: req.method,
//   });
// });

// // ─────────────────────────────────────────────
// // Global error handler
// // ─────────────────────────────────────────────
// app.use((err, _req, res, _next) => {
//   console.error("🚨 Server Error:", err.stack);
//   res.status(500).json({
//     message: "Server Error",
//     error:
//       process.env.NODE_ENV === "development"
//         ? err.message
//         : "Internal server error",
//   });
// });

// // ─────────────────────────────────────────────
// // Start server
// // ─────────────────────────────────────────────
// const server = http.createServer(app);
// initSocket(server);
// startFollowUpCron();
// startActivityReminderCron();
// startProposalFollowUpCron();

// const PORT = process.env.PORT || 5000;

// const startServer = async () => {
//   try {
//     await connectDB();
//     console.log("✅ MongoDB connected");
//   } catch (error) {
//     console.error("⚠️ MongoDB connection failed:", error.message);
//     console.error("⚠️ Server will still start");
//   }

//   server.listen(PORT, () => {
//     console.log(`✅ Server running on port ${PORT}`);
//     console.log(`🔗 CORS: ${process.env.FRONTEND_URL || "http://localhost:5173"}`);
//     console.log(`📁 Uploads dir: ${path.join(__dirname, "uploads")}`);
//     console.log(`📧 Gmail test: http://localhost:${PORT}/api/gmail/test`);
//     console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
//   });
// };

// startServer();//original




import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import fs from "fs";

import connectDB from "./config/db.js";
import routes from "./routes/index.routes.js";
import fileRoutes from "./routes/files.routes.js";
import { initSocket } from "./realtime/socket.js";
import { startFollowUpCron } from "./controllers/followups.cron.js";
import { startActivityReminderCron } from "./controllers/activityReminder.cron.js";
import { startProposalFollowUpCron } from "./controllers/proposalFollowUpCron.controller.js";
import gmailRoutes from "./routes/gmailRoutes.js";
import googleAuthRoutes from "./routes/googleAuthRoutes.js";
import whatsappRoutes from "./routes/whatsapp.routes.js";
import salesRoutes from "./routes/salesReports.routes.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ─────────────────────────────────────────────
// CORS — explicit list covering local dev + production
// ─────────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
  "https://uenjoytours.cloud",
];

// Add FRONTEND_URL from .env if provided and not already listed
if (
  process.env.FRONTEND_URL &&
  !allowedOrigins.includes(process.env.FRONTEND_URL)
) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (Postman, mobile, server-to-server)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn(`⚠️  CORS blocked for origin: ${origin}`);
    return callback(new Error(`CORS policy: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
  ],
  optionsSuccessStatus: 200, // fixes older browser preflight issues
};

// ✅ CORS must be registered FIRST — before any routes or other middleware
app.use(cors(corsOptions));

// ✅ Explicitly handle all OPTIONS preflight requests
app.options("*", cors(corsOptions));

// ─────────────────────────────────────────────
// Body parsers
// ─────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─────────────────────────────────────────────
// Static files
// ✅ Cross-origin headers so profile images load from frontend
// ─────────────────────────────────────────────
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    index: false,
    etag: true,
    lastModified: true,
    setHeaders: (res) => {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader("Access-Control-Allow-Origin", "*");
    },
  })
);

app.use(express.static(path.join(__dirname, "public")));

// ─────────────────────────────────────────────
// API Routes
// ─────────────────────────────────────────────
app.use("/api", routes);
app.use("/api/files", fileRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/gmail", gmailRoutes);
app.use("/api/google-auth", googleAuthRoutes);
app.use("/api/whatsapp", whatsappRoutes);

// Legacy Google callback redirect
app.get("/api/auth/google/callback", (req, res) => {
  const redirectUrl = `/api/google-auth/auth/google/callback?${new URLSearchParams(
    req.query
  ).toString()}`;
  res.redirect(redirectUrl);
});

// ─────────────────────────────────────────────
// Health check
// ─────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "CRM Server",
    allowedOrigins,
  });
});

// ─────────────────────────────────────────────
// 404 catch-all
// ─────────────────────────────────────────────
app.use((req, res) => {
  console.log(`❌ Route not found: ${req.method} ${req.url}`);
  res.status(404).json({
    message: "Route not found",
    path: req.url,
    method: req.method,
  });
});

// ─────────────────────────────────────────────
// Global error handler
// ─────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  if (err.message && err.message.startsWith("CORS policy")) {
    return res.status(403).json({ message: err.message });
  }
  console.error("🚨 Server Error:", err.stack);
  res.status(500).json({
    message: "Server Error",
    error:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal server error",
  });
});

// ─────────────────────────────────────────────
// Start server
// ─────────────────────────────────────────────
const server = http.createServer(app);
initSocket(server);
startFollowUpCron();
startActivityReminderCron();
startProposalFollowUpCron();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("⚠️ MongoDB connection failed:", error.message);
    console.error("⚠️ Server will still start");
  }

  server.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🔗 Allowed origins: ${allowedOrigins.join(", ")}`);
    console.log(`📁 Uploads dir: ${path.join(__dirname, "uploads")}`);
    console.log(`🏥 Health: http://localhost:${PORT}/api/health`);
  });
};

startServer();