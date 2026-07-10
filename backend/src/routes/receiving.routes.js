import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { isAdmin } from '../middleware/roles.js';
import { validate } from '../middleware/validate.js';
import { createReceivingSchema } from '../utils/validators.js';
import {
  getReceivings, getReceiving, createReceiving, updateReceiving, printReceiving,
} from '../controllers/receiving.controller.js';

const router = Router();

router.get('/', authenticate, getReceivings);
router.get('/:id', authenticate, getReceiving);
router.post('/', authenticate, isAdmin, validate(createReceivingSchema), createReceiving);
router.put('/:id', authenticate, isAdmin, updateReceiving);
router.get('/:id/print', authenticate, printReceiving);

export default router;