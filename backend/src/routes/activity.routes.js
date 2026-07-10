import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getActivity } from '../controllers/activity.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', getActivity);

export default router;