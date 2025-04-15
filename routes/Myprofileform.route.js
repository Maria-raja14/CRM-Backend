import express from "express";
import { createProfile } from "../controllers/Myprofileform.controller.js";

const router = express.Router();

router.post("/profile", createProfile);

export default router;
