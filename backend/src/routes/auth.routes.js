import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  login,
  logout,
  me,
  forgotPassword,
  resetPassword,
  refreshToken,
} from '../controllers/auth.controller.js';

const router = Router();

router.post('/login', login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, me);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/refresh-token', refreshToken);

export default router;