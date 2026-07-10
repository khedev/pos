import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getNotifications,
  markRead,
  markAllRead,
  deleteNotification,
} from '../controllers/notifications.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', getNotifications);
router.post('/:id/read', markRead);
router.post('/read-all', markAllRead);
router.delete('/:id', deleteNotification);

export default router;