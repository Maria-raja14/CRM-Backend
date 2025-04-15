import express from 'express';
import indexControllers from '../controllers/index.controllers.js';

const router = express.Router();


router.get('/', indexControllers.activityController.getActivities); 
router.get('/get/:id', indexControllers.activityController.getActivityById); 
router.post('/add', indexControllers.activityController.addActivity); 
router.put('/update/:id', indexControllers.activityController.updateActivity); 
router.delete('/delete/:id', indexControllers.activityController.deleteActivity); 

export default router
