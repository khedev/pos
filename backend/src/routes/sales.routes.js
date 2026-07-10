import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { isAdmin } from '../middleware/roles.js';
import { validate } from '../middleware/validate.js';
import { createSaleSchema } from '../utils/validators.js';
import {
  getSales, getSale, createSale, voidSale, getReceipt, printReceipt,
} from '../controllers/sales.controller.js';

const router = Router();

router.get('/', authenticate, getSales);
router.get('/:id', authenticate, getSale);
router.post('/', authenticate, validate(createSaleSchema), createSale);
router.post('/:id/void', authenticate, isAdmin, voidSale);
router.get('/:id/receipt', authenticate, getReceipt);
router.get('/:id/print', authenticate, printReceipt);

export default router;