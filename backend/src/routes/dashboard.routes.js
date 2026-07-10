import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getSummary, getGraph, getDailySales, getCategorySales,
  getItemSales, getWeeklySales, getMonthlySales, getProfitData,
  getBestSellers, getSlowMoving, getExpiringMedicines,
} from '../controllers/dashboard.controller.js';

const router = Router();

router.get('/', authenticate, getSummary);
router.get('/graph', authenticate, getGraph);
router.get('/daily-sales', authenticate, getDailySales);
router.get('/category-sales', authenticate, getCategorySales);
router.get('/item-sales', authenticate, getItemSales);
router.get('/weekly-sales', authenticate, getWeeklySales);
router.get('/monthly-sales', authenticate, getMonthlySales);
router.get('/profit', authenticate, getProfitData);
router.get('/best-sellers', authenticate, getBestSellers);
router.get('/slow-moving', authenticate, getSlowMoving);
router.get('/expiring', authenticate, getExpiringMedicines);

export default router;