import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorizePermission } from '../middleware/roles.js';
import {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  restoreCategory,
} from '../controllers/categories.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', getCategories);
router.get('/:id', getCategory);
router.post('/', authorizePermission('inventory.manage'), createCategory);
router.put('/:id', authorizePermission('inventory.manage'), updateCategory);
router.delete('/:id', authorizePermission('inventory.manage'), deleteCategory);
router.post('/:id/restore', authorizePermission('inventory.manage'), restoreCategory);

export default router;