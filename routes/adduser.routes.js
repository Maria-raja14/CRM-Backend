
import express from "express"
import indexController from "../controllers/index.controllers.js";



const router = express.Router();

router.post('/register', indexController.addUsers.signup);
router.get('/login', indexController.addUsers.login);
router.put('/update/:id', indexController.addUsers.updateUser);
router.get("/users", indexController.addUsers.getAllUsers);
router.get('/getUser', indexController.addUsers.getAllActiveUsers);
// router.put('/deactive', indexController.addUsers.deactivateUser);
// router.put('/active', indexController.addUsers.reactivateUser);




export default  router; 