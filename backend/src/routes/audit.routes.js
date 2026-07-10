import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorizePermission } from '../middleware/roles.js';
import { getAuditLogs, exportAuditLogs } from '../controllers/audit.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', authorizePermission('settings.manage'), getAuditLogs);
router.get('/export', authorizePermission('settings.manage'), exportAuditLogs);

export default router;