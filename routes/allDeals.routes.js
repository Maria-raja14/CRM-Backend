import express from 'express';
import indexControllers from '../controllers/index.controllers.js';

const router = express.Router();


router.get('/', indexControllers.allDealsController.getDeals); 
router.get('/get/:id', indexControllers.allDealsController.getDealById); 
router.post('/add', indexControllers.allDealsController.addDeal); 
router.put('/update/:id', indexControllers.allDealsController.updateDeal); 
router.delete('/delete/:id', indexControllers.allDealsController.deleteDeal); 

export default router
