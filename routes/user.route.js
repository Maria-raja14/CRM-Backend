import express from 'express'
import indexController from "../controllers/index.controllers.js";


const router=express.Router();


router.post("/login",indexController.users.login);
router.post("/logout",indexController.users.logout);



export default router;