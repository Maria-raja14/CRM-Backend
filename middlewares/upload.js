// import multer from "multer";
// import path from "path";
// import fs from "fs";

// // Set storage folder
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     const uploadPath = path.join("uploads", "leads");
//     fs.mkdirSync(uploadPath, { recursive: true });
//     cb(null, uploadPath);
//   },
//   filename: function (req, file, cb) {
//     const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
//     cb(null, uniqueSuffix + "-" + file.originalname);
//   },
// });

// // Accept all file types
// const fileFilter = (req, file, cb) => {
//   cb(null, true); // accept all files
// };

// const upload = multer({ storage, fileFilter });

// export default upload;//ori


import multer from "multer";
import path from "path";
import fs from "fs";

// Set storage folder
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join("uploads", "leads");
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

// File filter to accept all file types
const fileFilter = (req, file, cb) => {
  cb(null, true);
};

// Configure multer with 20MB file size limit
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit
  },
});

export default upload;