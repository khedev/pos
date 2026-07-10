/**
 * Helper utilities for PGPOS
 */

/**
 * Generate receipt number in format RCP-YYMMDD-XXXX
 */
export const generateReceiptNumber = () => {
  const now = new Date();
  const yy = now.getFullYear().toString().slice(-2);
  const mm = (now.getMonth() + 1).toString().padStart(2, '0');
  const dd = now.getDate().toString().padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `RCP-${yy}${mm}${dd}-${random}`;
};

/**
 * Generate receiving number in format RCV-YYMMDD-XXXX
 */
export const generateReceivingNumber = () => {
  const now = new Date();
  const yy = now.getFullYear().toString().slice(-2);
  const mm = (now.getMonth() + 1).toString().padStart(2, '0');
  const dd = now.getDate().toString().padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `RCV-${yy}${mm}${dd}-${random}`;
};

/**
 * Calculate VAT amount
 */
export const calculateVAT = (amount, rate = 0.12) => {
  return amount * rate;
};

/**
 * Calculate profit
 */
export const calculateProfit = (sellingPrice, costPrice, quantity = 1) => {
  return (Number(sellingPrice) - Number(costPrice)) * quantity;
};

/**
 * Format currency to PHP format
 */
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
};

/**
 * Calculate pagination range for Supabase
 */
export const paginate = (page = 1, limit = 20) => {
  const p = Math.max(1, parseInt(page));
  const l = Math.min(100, Math.max(1, parseInt(limit)));
  const from = (p - 1) * l;
  const to = from + l - 1;
  return { from, to, page: p, limit: l };
};

/**
 * Build date range filter for Supabase query
 */
export const buildDateFilter = (query, field = 'created_at', startDate, endDate) => {
  if (startDate) {
    query = query.gte(field, new Date(startDate).toISOString());
  }
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    query = query.lte(field, end.toISOString());
  }
  return query;
};

/**
 * Get date range for a period
 */
export const getDateRange = (period = 'daily') => {
  const now = new Date();
  let startDate, endDate;

  switch (period) {
    case 'daily':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'weekly': {
      const dayOfWeek = now.getDay();
      startDate = new Date(now);
      startDate.setDate(now.getDate() - dayOfWeek);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      break;
    }
    case 'monthly':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    case 'annual':
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);
  }

  return { startDate: startDate.toISOString(), endDate: endDate.toISOString() };
};

/**
 * Sanitize string for search
 */
export const sanitizeSearch = (search) => {
  if (!search) return '';
  return search.trim().replace(/[%_]/g, '\\$&');
};

/**
 * Parse boolean from string or boolean
 */
export const parseBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true' || value === '1';
  return false;
};