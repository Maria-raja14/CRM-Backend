import express from "express";
import { getSocialLinks, addSocialLink, updateSocialLink, deleteSocialLink } from "../controllers/SocialLinks.controller.js";

const router = express.Router();

router.get("/social-links", getSocialLinks);
router.post("/social-links", addSocialLink);
 router.put("/social-links/:id", updateSocialLink);
 router.delete("/social-links/:id", deleteSocialLink);

export default router;
