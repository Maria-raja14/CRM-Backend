// import express from "express";
// import dotenv from "dotenv";
// import cors from "cors";
// import path from "path";
// import { fileURLToPath } from "url";
// import http from "http";

// import connectDB from "./config/db.js";
// import routes from "./routes/index.routes.js";
// import fileRoutes from "./routes/files.routes.js";
// import { initSocket } from "./realtime/socket.js";
// import { startFollowUpCron } from "./controllers/followups.cron.js";
// import { startProposalFollowUpCron } from "./controllers/proposalFollowUpCron.controller.js";
// import gmailRoutes from "./routes/gmailRoutes.js";
// import googleAuthRoutes from "./routes/googleAuthRoutes.js";
// import whatsappRoutes from "./routes/whatsapp.routes.js";
// import salesRoutes from "./routes/salesReports.routes.js";
// import callRoutes from "./routes/call.routes.js";
// import facebookLeadRoutes from "./routes/facebookLead.routes.js";
// import facebookFormRoutes from "./routes/facebookForm.routes.js";

// dotenv.config();

// const __filename = fileURLToPath(import.meta.url);
// const __dirname  = path.dirname(__filename);

// const app = express();

// // ─── CORS ─────────────────────────────────────────────────────────────────────
// const allowedOrigins = [
//   "http://localhost:5173",
//   "http://localhost:3000",
//   "http://127.0.0.1:5173",
//   "http://127.0.0.1:3000",
//   "https://uenjoytours.cloud",
//   "https://crm.stagingzar.com",
// ];

// if (process.env.FRONTEND_URL && !allowedOrigins.includes(process.env.FRONTEND_URL)) {
//   allowedOrigins.push(process.env.FRONTEND_URL);
// }

// const corsOptions = {
//   origin: (origin, callback) => {
//     if (!origin) return callback(null, true);
//     if (allowedOrigins.includes(origin)) return callback(null, true);
//     console.warn(`⚠️  CORS blocked: ${origin}`);
//     return callback(new Error(`CORS policy: origin ${origin} not allowed`));
//   },
//   credentials: true,
//   methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
//   allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
//   optionsSuccessStatus: 200,
// };

// app.use(cors(corsOptions));
// app.options("*", cors(corsOptions));

// // ─── Body parsers ──────────────────────────────────────────────────────────────
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // ─── Static files ──────────────────────────────────────────────────────────────
// app.use(
//   "/uploads",
//   express.static(path.join(__dirname, "uploads"), {
//     setHeaders: (res) => {
//       res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
//       res.setHeader("Access-Control-Allow-Origin", "*");
//     },
//   })
// );
// app.use(express.static(path.join(__dirname, "public")));

// // ─── API Routes ────────────────────────────────────────────────────────────────
// // IMPORTANT: facebook-form route should be BEFORE generic routes
// app.use("/api/facebook-form", facebookFormRoutes);
// app.use("/api/facebook-leads", facebookLeadRoutes);
// app.use("/api", routes);
// app.use("/api/files", fileRoutes);
// app.use("/api/sales", salesRoutes);
// app.use("/api/gmail", gmailRoutes);
// app.use("/api/google-auth", googleAuthRoutes);
// app.use("/api/whatsapp", whatsappRoutes);
// app.use("/api/call", callRoutes);

// // Legacy Google callback
// app.get("/api/auth/google/callback", (req, res) => {
//   const redirectUrl = `/api/google-auth/auth/google/callback?${new URLSearchParams(req.query)}`;
//   res.redirect(redirectUrl);
// });

// // ─── Health check ──────────────────────────────────────────────────────────────
// app.get("/api/health", (_req, res) => {
//   res.json({
//     status: "OK",
//     timestamp: new Date().toISOString(),
//     service: "CRM Server",
//     allowedOrigins,
//     webhooks: {
//       whatsapp_inbound:    "/api/whatsapp/webhook",
//       whatsapp_status:     "/api/whatsapp/status",
//       call_inbound:        "/api/call/webhook",
//       call_status:         "/api/call/status",
//       call_recording:      "/api/call/recording-callback",
//       facebook_leads:      "/api/facebook-leads/webhook",
//     },
//   });
// });

// // ─── 404 + Error handlers ──────────────────────────────────────────────────────
// app.use((req, res) => {
//   console.log(`❌ Not found: ${req.method} ${req.url}`);
//   res.status(404).json({ message: "Route not found", path: req.url });
// });

// app.use((err, _req, res, _next) => {
//   if (err.message?.startsWith("CORS policy"))
//     return res.status(403).json({ message: err.message });
//   console.error("🚨 Server Error:", err.stack);
//   res.status(500).json({
//     message: "Server Error",
//     error: process.env.NODE_ENV === "development" ? err.message : "Internal server error",
//   });
// });

// // ─── Start server ──────────────────────────────────────────────────────────────
// const server = http.createServer(app);
// initSocket(server);
// startFollowUpCron();
// startProposalFollowUpCron();

// const PORT = process.env.PORT || 5000;

// const startServer = async () => {
//   try {
//     await connectDB();
//     console.log("✅ MongoDB connected");
//   } catch (error) {
//     console.error("⚠️ MongoDB connection failed:", error.message);
//   }

//   server.listen(PORT, () => {
//     console.log(`✅ Server running on port ${PORT}`);
//     console.log(`🟢 WhatsApp webhook:     POST https://yourdomain.com/api/whatsapp/webhook`);
//     console.log(`🟢 WhatsApp status:      POST https://yourdomain.com/api/whatsapp/status`);
//     console.log(`📞 Call webhook:         POST https://yourdomain.com/api/call/webhook`);
//     console.log(`📞 Call status:          POST https://yourdomain.com/api/call/status`);
//     console.log(`📞 Call recording:       POST https://yourdomain.com/api/call/recording-callback`);
//     console.log(`📘 Facebook leads:       GET/POST https://yourdomain.com/api/facebook-leads/webhook`);
//     console.log(`📘 Facebook form:        POST https://yourdomain.com/api/facebook-form/create`);
//     console.log(`🔗 Allowed origins: ${allowedOrigins.join(", ")}`);
//   });
// };

// startServer();//all work correctly..




// server.js  (FULL UPDATED FILE)
// Added: TripMagics poller + tripmagic routes

import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";

import connectDB from "./config/db.js";
import routes from "./routes/index.routes.js";
import fileRoutes from "./routes/files.routes.js";
import { initSocket } from "./realtime/socket.js";
import { startFollowUpCron } from "./controllers/followups.cron.js";
import { startProposalFollowUpCron } from "./controllers/proposalFollowUpCron.controller.js";
import gmailRoutes from "./routes/gmailRoutes.js";
import googleAuthRoutes from "./routes/googleAuthRoutes.js";
import salesRoutes from "./routes/salesReports.routes.js";
import callRoutes from "./routes/call.routes.js";
import facebookLeadRoutes from "./routes/facebookLead.routes.js";
import facebookFormRoutes from "./routes/facebookForm.routes.js";

// ✅ NEW: TripMagics
import tripmagicRoutes from "./routes/tripmagic.routes.js";
import { startTripMagicPoller } from "./services/tripmagicPoller.service.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();

// ─── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
  "https://uenjoytours.cloud",
  "https://crm.stagingzar.com",
];

if (process.env.FRONTEND_URL && !allowedOrigins.includes(process.env.FRONTEND_URL)) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.warn(`⚠️  CORS blocked: ${origin}`);
    return callback(new Error(`CORS policy: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// ─── Body parsers ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Static files ──────────────────────────────────────────────────────────────
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    setHeaders: (res) => {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader("Access-Control-Allow-Origin", "*");
    },
  })
);
app.use(express.static(path.join(__dirname, "public")));

// ─── API Routes ────────────────────────────────────────────────────────────────
app.use("/api/facebook-form",  facebookFormRoutes);
app.use("/api/facebook-leads", facebookLeadRoutes);
app.use("/api",                routes);
app.use("/api/files",          fileRoutes);
app.use("/api/sales",          salesRoutes);
app.use("/api/gmail",          gmailRoutes);
app.use("/api/google-auth",    googleAuthRoutes);

// ✅ NEW: TripMagics admin routes
app.use("/api/tripmagic", tripmagicRoutes);

// Legacy Google callback
app.get("/api/auth/google/callback", (req, res) => {
  const redirectUrl = `/api/google-auth/auth/google/callback?${new URLSearchParams(req.query)}`;
  res.redirect(redirectUrl);
});

// ─── Health check ──────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "CRM Server",
    allowedOrigins,
    webhooks: {
      facebook_leads: "/api/facebook-leads/webhook",
    },
    tripmagic: {
      poller: "active",
      pollInterval: "every 2 minutes",
    },
  });
});

// ─── 404 + Error handlers ──────────────────────────────────────────────────────
app.use((req, res) => {
  console.log(`❌ Not found: ${req.method} ${req.url}`);
  res.status(404).json({ message: "Route not found", path: req.url });
});

app.use((err, _req, res, _next) => {
  if (err.message?.startsWith("CORS policy"))
    return res.status(403).json({ message: err.message });
  console.error("🚨 Server Error:", err.stack);
  res.status(500).json({
    message: "Server Error",
    error: process.env.NODE_ENV === "development" ? err.message : "Internal server error",
  });
});

// ─── Start server ──────────────────────────────────────────────────────────────
const server = http.createServer(app);
initSocket(server);
startFollowUpCron();
startProposalFollowUpCron();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    console.log("✅ MongoDB connected");

    // ✅ NEW: Start TripMagics email poller AFTER DB is ready
    startTripMagicPoller();
    console.log("✅ TripMagics email poller started");

  } catch (error) {
    console.error("⚠️ MongoDB connection failed:", error.message);
  }

  server.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📘 Facebook leads:  GET/POST https://yourdomain.com/api/facebook-leads/webhook`);
    console.log(`📘 TripMagics poll: POST https://yourdomain.com/api/tripmagic/poll`);
    console.log(`🔗 Allowed origins: ${allowedOrigins.join(", ")}`);
  });
};

startServer();