
import express from "express"
import indexController from "../controllers/index.controllers.js";


const router = express.Router();

router.post('/add-meeting', indexController.meetingController.addMeeting);


export default  router; 