// import express from "express";
// import dotenv from "dotenv";
// import cors from "cors";
// import path from "path";
// import { fileURLToPath } from "url";
// import http from "http";
// import fs from "fs"; // Added missing import

// import connectDB from "./config/db.js";
// import routes from "./routes/index.routes.js";
// import fileRoutes from "./routes/files.routes.js";
// import { initSocket } from "./realtime/socket.js";
// import { startFollowUpCron } from "./controllers/followups.cron.js";
// import { startActivityReminderCron } from "./controllers/activityReminder.cron.js";
// import { startProposalFollowUpCron } from "./controllers/proposalFollowUpCron.controller.js";

// dotenv.config();

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// const app = express();
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.use(cors());

// app.use("/uploads", express.static(path.join(__dirname, "uploads")));
// app.use(express.static(path.join(__dirname, "public")));

// app.use("/api", routes);
// app.use("/api/files", fileRoutes);

// // Add this route for file downloads
// app.get("/api/files/download", (req, res) => {
//   try {
//     const { filePath } = req.query;

//     if (!filePath) {
//       return res.status(400).json({ message: "File path is required" });
//     }

//     // Security check: Ensure the file path is within your uploads directory
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

// app.use((req, res) => res.status(404).json({ message: "Route not found" }));
// app.use((err, _req, res, _next) => {
//   console.error(err.stack);
//   res.status(500).json({ message: "Server Error" });
// });

// const server = http.createServer(app);
// initSocket(server); // Socket.IO
// startFollowUpCron();
// startActivityReminderCron(); // ✅ for activities      // Cron jobs
// startProposalFollowUpCron();

// const PORT = process.env.PORT || 5000;

// const startServer = async () => {
//   try {
//     await connectDB();
//     server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
//   } catch (error) {
//     console.error("❌ Failed to start server:", error.message);
//     process.exit(1);
//   }
// };

// startServer();













import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import fs from "fs";
import jwt from "jsonwebtoken";
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import connectDB from "./config/db.js";
import routes from "./routes/index.routes.js";
import fileRoutes from "./routes/files.routes.js";
import callLogRoutes from "./routes/callLog.routes.js";
import botRoutes from "./routes/bot.routes.js";
import { initSocket } from "./realtime/socket.js";
import { startFollowUpCron } from "./controllers/followups.cron.js";
import { startActivityReminderCron } from "./controllers/activityReminder.cron.js";
import { startProposalFollowUpCron } from "./controllers/proposalFollowUpCron.controller.js";
import lostDealRoutes from "./routes/lostDealRoutes.js";
import clientLTVRoutes from "./routes/clientLTVRoutes.js";
import { startDealFollowUpCron } from "./controllers/dealFollowup.cron.js";


dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
// Global rate limiting for all routes 
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(helmet());
app.use(mongoSanitize());
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
app.use('/api/', globalLimiter);
app.use(globalLimiter);
// Add this RIGHT BEFORE app.use("/api", routes)
console.log("🔍 Checking routes...");
console.log("Routes import:", routes ? "✅ Loaded" : "❌ Not loaded");
console.log("Routes type:", typeof routes);
console.log("Routes stack:", routes?.stack?.length || 0);

// Mount routes
app.use("/api", routes);
app.use("/api/files", fileRoutes);
app.use("/api/deals", lostDealRoutes);
app.use("/api/cltv", clientLTVRoutes);
app.use("/api/calllogs", callLogRoutes); // Call log tracking routes
app.use("/api/bot", botRoutes); // Bot command routes

// Protected file download endpoint
app.get("/api/files/download", authenticateToken, (req, res) => {
  try {
    const { filePath } = req.query;

    if (!filePath) {
      return res.status(400).json({ message: "File path is required" });
    }

    // Security check: Ensure the file path is within your uploads directory
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

app.use((req, res) => res.status(404).json({ message: "Route not found" }));
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Server Error" });
});

const server = http.createServer(app);
initSocket(server); // Socket.IO
startFollowUpCron();
startActivityReminderCron();
startProposalFollowUpCron();
startDealFollowUpCron(); // ✅ for deals      // Cron jobs  

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