import express from "express";
import { protect, adminCreateOnly } from "../middlewares/auth.middleware.js";
import { getSettings, updateLogo, updateFavicon, updateCompanyName } from "../controllers/settingsController.js";
import uploadCompanyLogo from "../middlewares/uploadCompanyLogo.js";

const router = express.Router();

/**
 * GET company settings
 */
router.get("/", getSettings);

/**
 * UPDATE company logo
 */
router.post(
  "/logo",
  protect,                // Must be logged in
  adminCreateOnly,        // Must be Admin
  uploadCompanyLogo.single("logo"),
  updateLogo
);

/**
 * UPDATE favicon
 */
router.post(
  "/favicon",
  protect,
  adminCreateOnly,
  uploadCompanyLogo.single("favicon"),
  updateFavicon
);

/**
 * UPDATE company name (browser title)
 */
router.put(
  "/company-name",
  protect,
  adminCreateOnly,
  updateCompanyName
);

export default router;