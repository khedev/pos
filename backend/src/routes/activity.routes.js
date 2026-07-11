import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getActivity, getActiveUsers, getSystemHealth } from '../controllers/activity.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', getActivity);
router.get('/active-users', getActiveUsers);
router.get('/system-health', getSystemHealth);

export default router;
