import express from 'express'
import { login, logout } from "../controllers/index.controllers.js";


const router=express.Router();


router.post("/login",login);
router.post("/logout",logout);



export default router;