import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorizePermission } from '../middleware/roles.js';
import { getSettings, updateSettings } from '../controllers/settings.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', getSettings);
router.put('/:key', authorizePermission('settings.manage'), updateSettings);

export default router;