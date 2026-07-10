/**
 * Zod validation schemas for PGPOS API
 */
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address').transform(e => e.toLowerCase().trim()),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
});

export const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address').transform(e => e.toLowerCase().trim()),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
  role: z.enum(['admin', 'manager', 'cashier', 'csr'], { message: 'Invalid role' }),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().transform(e => e.toLowerCase().trim()).optional(),
  role: z.enum(['admin', 'manager', 'cashier', 'csr']).optional(),
  is_active: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

export const createProductSchema = z.object({
  barcode: z.string().max(50).optional().nullable(),
  sku: z.string().max(50).optional().nullable(),
  name: z.string().min(1, 'Product name is required').max(200),
  generic_name: z.string().max(200).optional().nullable(),
  brand: z.string().max(100).optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  supplier_id: z.string().uuid().optional().nullable(),
  unit: z.string().max(50).default('piece'),
  cost_price: z.number().min(0).default(0),
  selling_price: z.number().min(0, 'Selling price must be positive'),
  current_stock: z.number().min(0).default(0),
  min_stock: z.number().min(0).default(0),
  max_stock: z.number().min(0).optional().nullable(),
});

export const updateProductSchema = createProductSchema.partial();

export const createSaleSchema = z.object({
  items: z.array(z.object({
    product_id: z.string().uuid(),
    batch_id: z.string().uuid().optional().nullable(),
    quantity: z.number().positive('Quantity must be positive'),
    price: z.number().min(0),
    cost: z.number().min(0).default(0),
    discount: z.number().min(0).default(0),
  })).min(1, 'At least one item is required'),
  payment_method: z.enum(['cash', 'card', 'gcash', 'maya'], { message: 'Invalid payment method' }),
  payment_amount: z.number().min(0, 'Payment amount must be positive'),
  discount_type: z.enum(['none', 'senior', 'pwd', 'other']).default('none'),
  discount_amount: z.number().min(0).default(0),
  senior_id: z.string().optional().nullable(),
});

export const createReceivingSchema = z.object({
  invoice_number: z.string().max(100).optional().nullable(),
  supplier_id: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(z.object({
    product_id: z.string().uuid(),
    batch_number: z.string().max(50),
    quantity: z.number().positive('Quantity must be positive'),
    cost_price: z.number().min(0),
    expiration_date: z.string().optional().nullable(),
  })).min(1, 'At least one item is required'),
});

export const updateReceivingSchema = createReceivingSchema.partial();

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100),
  description: z.string().optional().nullable(),
});

export const updateCategorySchema = createCategorySchema.partial();

export const createSupplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required').max(150),
  contact_person: z.string().max(100).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  phone: z.string().max(50).optional().nullable(),
  address: z.string().optional().nullable(),
});

export const updateSupplierSchema = createSupplierSchema.partial();

export const settingsSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.any(),
});

export const notificationSchema = z.object({
  type: z.string().max(50).default('info'),
  title: z.string().min(1).max(200),
  message: z.string().optional().nullable(),
  link: z.string().optional().nullable(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address').transform(e => e.toLowerCase().trim()),
});

export const resetPasswordSchema = z.object({
  accessToken: z.string().min(1, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});