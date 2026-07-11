import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  deleteNotification,
} from '../controllers/notifications.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.put('/:id/read', markRead);
router.put('/read-all', markAllRead);
router.delete('/:id', deleteNotification);

export default router;