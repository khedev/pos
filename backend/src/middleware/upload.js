/**
 * File upload middleware for PGPOS
 * Uses multer for handling file uploads
 *
 * NOTE: On Vercel serverless, the filesystem is ephemeral.
 * Uploaded files are written to /tmp and will NOT persist
 * across function invocations. For production, use external
 * storage (Supabase Storage, S3, etc.) for permanent file storage.
 */
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use /tmp on Vercel (serverless), local uploads directory otherwise
const isVercel = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
const UPLOAD_BASE = isVercel
  ? path.join(os.tmpdir(), 'uploads')
  : path.resolve(__dirname, '../../uploads');

// Ensure upload directories exist
const uploadDirs = [
  path.join(UPLOAD_BASE, 'products'),
  path.join(UPLOAD_BASE, 'avatars'),
  path.join(UPLOAD_BASE, 'excel'),
];

uploadDirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Storage configuration
const productStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(UPLOAD_BASE, 'products'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `product-${uniqueSuffix}${ext}`);
  },
});

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(UPLOAD_BASE, 'avatars'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `avatar-${uniqueSuffix}${ext}`);
  },
});

const excelStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(UPLOAD_BASE, 'excel'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `import-${uniqueSuffix}.xlsx`);
  },
});

// File filters
const imageFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and WebP images are allowed'), false);
  }
};

const excelFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.oasis.opendocument.spreadsheet',
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only Excel files (.xlsx, .xls) are allowed'), false);
  }
};

// Multer instances
export const uploadProductImage = multer({
  storage: productStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: imageFilter,
}).single('image');

export const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 1 * 1024 * 1024 }, // 1MB
  fileFilter: imageFilter,
}).single('avatar');

export const uploadExcel = multer({
  storage: excelStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: excelFilter,
}).single('file');

// Error handling wrapper for multer
export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large' });
    }
    return res.status(400).json({ message: err.message });
  }
  if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
};