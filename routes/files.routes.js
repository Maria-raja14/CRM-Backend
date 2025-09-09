


import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import fs from "fs";
import path from "path";

const router = express.Router();

// Add this route for file downloads
router.get("/download", protect, async (req, res) => {
  try {
    const { filePath } = req.query;
    
    if (!filePath) {
      return res.status(400).json({ message: "File path is required" });
    }

    // Security check: Ensure the file path is within your uploads directory
    const fullPath = path.join(process.cwd(), filePath);
    const uploadsDir = path.join(process.cwd(), 'uploads');
    
    if (!fullPath.startsWith(uploadsDir)) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ message: "File not found" });
    }

    const fileName = path.basename(fullPath);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    
    const fileStream = fs.createReadStream(fullPath);
    fileStream.pipe(res);
  } catch (error) {
    console.error("File download error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;