import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorizePermission } from '../middleware/roles.js';
import {
  getSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from '../controllers/suppliers.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', getSuppliers);
router.get('/:id', getSupplier);
router.post('/', authorizePermission('inventory.manage'), createSupplier);
router.put('/:id', authorizePermission('inventory.manage'), updateSupplier);
router.delete('/:id', authorizePermission('inventory.manage'), deleteSupplier);

export default router;