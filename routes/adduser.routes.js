
import express from "express"
import indexController from "../controllers/index.controllers.js";



const router = express.Router();

router.post('/crusers', indexController.addUsers.createUser);
router.get('/grusers', indexController.addUsers.getUsers);

export default  router; 