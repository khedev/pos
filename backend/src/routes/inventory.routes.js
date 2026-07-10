import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { isAdmin } from '../middleware/roles.js';
import { uploadProductImage, uploadExcel } from '../middleware/upload.js';
import {
  getItems, getItem, createItem, updateItem, deleteItem,
  archiveItem,
  importExcel, exportExcel, exportPdf,
  uploadImage, deleteImage,
} from '../controllers/inventory.controller.js';

const router = Router();

// CRUD
router.get('/', authenticate, getItems);
router.get('/:id', authenticate, getItem);
router.post('/', authenticate, isAdmin, createItem);
router.put('/:id', authenticate, isAdmin, updateItem);
router.delete('/:id', authenticate, isAdmin, deleteItem);

// Archive
router.put('/:id/archive', authenticate, isAdmin, archiveItem);

// Import/Export
router.post('/import', authenticate, isAdmin, uploadExcel, importExcel);
router.get('/export/excel', authenticate, exportExcel);
router.get('/export/pdf', authenticate, exportPdf);

// Image management
router.post('/:id/image', authenticate, isAdmin, uploadProductImage, uploadImage);
router.delete('/:id/image', authenticate, isAdmin, deleteImage);

export default router;