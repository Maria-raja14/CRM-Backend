// import express from "express";
// import dotenv from "dotenv";
// import cors from "cors";
// import path from "path";
// import { fileURLToPath } from "url";
// import http from "http";
// import fs from "fs";
// import jwt from "jsonwebtoken";

// import connectDB from "./config/db.js";
// import routes from "./routes/index.routes.js";
// import fileRoutes from "./routes/files.routes.js";
// import { initSocket } from "./realtime/socket.js";
// import { startFollowUpCron } from "./controllers/followups.cron.js";
// import { startActivityReminderCron } from "./controllers/activityReminder.cron.js";
// import { startProposalFollowUpCron } from "./controllers/proposalFollowUpCron.controller.js";
// import gmailRoutes from "./routes/gmailRoutes.js";
// import googleAuthRoutes from "./routes/googleAuthRoutes.js"; // Add this import

// dotenv.config();

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// const app = express();

// //CORS Configuration - UPDATED to include PATCH method
// const corsOptions = {
//   origin: process.env.FRONTEND_URL || "http://localhost:5173",
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
// };//old one


// // In your backend server file (the second code block), update the CORS configuration:

// // const corsOptions = {
// //   origin: [
// //     process.env.FRONTEND_URL || "http://localhost:5173",
// //     "https://crm.stagingzar.com", // Add your live URL
// //     "http://localhost:3000", // Optional: for local testing
// //   ],
// //   credentials: true,
// //   methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
// //   allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
// // };


// app.use(cors(corsOptions));
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // Handle preflight requests for all routes
// app.options('*', cors(corsOptions));

// app.use("/uploads", express.static(path.join(__dirname, "uploads")));
// app.use(express.static(path.join(__dirname, "public")));

// // Authentication middleware
// const authenticateToken = (req, res, next) => {
//   const authHeader = req.headers["authorization"];
//   const token = authHeader && authHeader.split(" ")[1];

//   if (!token) {
//     return res.status(401).json({ message: "Not authorized, no token" });
//   }

//   jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
//     if (err) {
//       return res.status(403).json({ message: "Token is not valid" });
//     }
//     req.user = user;
//     next();
//   });
// };

// // API routes
// app.use("/api", routes);
// app.use("/api/files", fileRoutes);
// app.use("/api/gmail", gmailRoutes);
// app.use('/api/google-auth', googleAuthRoutes); // Add this line

// app.get('/api/auth/google/callback', (req, res) => {
//   console.log('📝 Redirecting old callback URL to new one...');
//   const { code, state, error } = req.query;
//   const redirectUrl = `/api/google-auth/auth/google/callback?${new URLSearchParams(req.query).toString()}`;
//   res.redirect(redirectUrl);
// });

// // Protected file download endpoint
// app.get("/api/files/download", authenticateToken, (req, res) => {
//   try {
//     const { filePath } = req.query;

//     if (!filePath) {
//       return res.status(400).json({ message: "File path is required" });
//     }

//     const fullPath = path.join(__dirname, filePath);
//     const uploadsDir = path.join(__dirname, "uploads");

//     if (!fullPath.startsWith(uploadsDir)) {
//       return res.status(403).json({ message: "Access denied" });
//     }

//     if (!fs.existsSync(fullPath)) {
//       return res.status(404).json({ message: "File not found" });
//     }

//     const fileName = path.basename(fullPath);
//     res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
//     res.setHeader("Content-Type", "application/octet-stream");

//     const fileStream = fs.createReadStream(fullPath);
//     fileStream.pipe(res);
//   } catch (error) {
//     console.error("File download error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// });

// // Health check endpoint
// app.get("/api/health", (req, res) => {
//   res.json({
//     status: "OK",
//     timestamp: new Date().toISOString(),
//     service: "CRM Server"
//   });
// });

// // Catch-all handler for undefined routes
// app.use((req, res) => {
//   console.log(`❌ Route not found: ${req.method} ${req.url}`);
//   res.status(404).json({
//     message: "Route not found",
//     path: req.url,
//     method: req.method
//   });
// });

// // Global error handler
// app.use((err, _req, res, _next) => {
//   console.error("🚨 Server Error:", err.stack);
//   res.status(500).json({
//     message: "Server Error",
//     error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
//   });
// });

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
//     console.error("⚠️ Server will still start (Gmail needs no DB)");
//   }

//   server.listen(PORT, () => {
//     console.log(`✅ Server running on port ${PORT}`);
//     console.log(`🔗 CORS: ${process.env.FRONTEND_URL || "http://localhost:5173"}`);
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
import jwt from "jsonwebtoken";

import connectDB from "./config/db.js";
import routes from "./routes/index.routes.js";
import fileRoutes from "./routes/files.routes.js";
import { initSocket } from "./realtime/socket.js";
import { startFollowUpCron } from "./controllers/followups.cron.js";
import { startActivityReminderCron } from "./controllers/activityReminder.cron.js";
import { startProposalFollowUpCron } from "./controllers/proposalFollowUpCron.controller.js";
import gmailRoutes from "./routes/gmailRoutes.js";
import googleAuthRoutes from "./routes/googleAuthRoutes.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Detect environment
const isProduction = process.env.NODE_ENV === 'production';
console.log(`🌍 Running in ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} mode`);

// ✅ Dynamic CORS configuration based on environment
const corsOptions = {
  origin: function (origin, callback) {
    // Allowed origins
    const allowedOrigins = [
      process.env.FRONTEND_URL_LOCAL || "http://localhost:5173",
      process.env.FRONTEND_URL_LIVE || "https://crm.stagingzar.com",
      "http://localhost:3000"
    ];
    
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('⚠️ CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Handle preflight requests
app.options('*', cors(corsOptions));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "public")));

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Token is not valid" });
    }
    req.user = user;
    next();
  });
};

// API routes
app.use("/api", routes);
app.use("/api/files", fileRoutes);
app.use("/api/gmail", gmailRoutes);
app.use('/api/google-auth', googleAuthRoutes);

// ✅ Handle old callback URL redirect
app.get('/auth/google/callback', (req, res) => {
  console.log('📝 Redirecting old callback URL to new one...');
  const redirectUrl = `/api/google-auth/auth/google/callback?${new URLSearchParams(req.query).toString()}`;
  res.redirect(redirectUrl);
});

// Protected file download endpoint
app.get("/api/files/download", authenticateToken, (req, res) => {
  try {
    const { filePath } = req.query;

    if (!filePath) {
      return res.status(400).json({ message: "File path is required" });
    }

    const fullPath = path.join(__dirname, filePath);
    const uploadsDir = path.join(__dirname, "uploads");

    if (!fullPath.startsWith(uploadsDir)) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ message: "File not found" });
    }

    const fileName = path.basename(fullPath);
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Type", "application/octet-stream");

    const fileStream = fs.createReadStream(fullPath);
    fileStream.pipe(res);
  } catch (error) {
    console.error("File download error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    service: "CRM Server",
    environment: isProduction ? 'production' : 'development'
  });
});

// Catch-all handler for undefined routes
app.use((req, res) => {
  console.log(`❌ Route not found: ${req.method} ${req.url}`);
  res.status(404).json({
    message: "Route not found",
    path: req.url,
    method: req.method
  });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error("🚨 Server Error:", err.stack);
  res.status(500).json({
    message: "Server Error",
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

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
  }

  server.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🔗 Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
    console.log(`🔗 CORS allowed origins:`);
    console.log(`   - Local: ${process.env.FRONTEND_URL_LOCAL || "http://localhost:5173"}`);
    console.log(`   - Live: ${process.env.FRONTEND_URL_LIVE || "https://crm.stagingzar.com"}`);
    console.log(`📧 Gmail test: http://localhost:${PORT}/api/gmail/test`);
    console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
  });
};

startServer();