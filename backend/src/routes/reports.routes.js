import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getSalesReport, getItemSalesReport, getInventoryReport, getReceivingReport,
  exportSalesPdf, exportSalesExcel, exportInventoryPdf, exportInventoryExcel,
} from '../controllers/reports.controller.js';

const router = Router();

router.get('/sales', authenticate, getSalesReport);
router.get('/item-sales', authenticate, getItemSalesReport);
router.get('/inventory', authenticate, getInventoryReport);
router.get('/receiving', authenticate, getReceivingReport);

// Export endpoints
router.get('/sales/export/pdf', authenticate, exportSalesPdf);
router.get('/sales/export/excel', authenticate, exportSalesExcel);
router.get('/inventory/export/pdf', authenticate, exportInventoryPdf);
router.get('/inventory/export/excel', authenticate, exportInventoryExcel);

export default router;