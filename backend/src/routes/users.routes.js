import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { isAdmin } from '../middleware/roles.js';
import { getUsers, createUser, updateUser, deleteUser, resetUserPassword } from '../controllers/users.controller.js';

const router = Router();

router.get('/', authenticate, isAdmin, getUsers);
router.post('/', authenticate, isAdmin, createUser);
router.put('/:id', authenticate, isAdmin, updateUser);
router.delete('/:id', authenticate, isAdmin, deleteUser);
router.post('/:id/reset-password', authenticate, isAdmin, resetUserPassword);

export default router;
