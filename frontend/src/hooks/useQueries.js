/**
 * Centralized data fetching hooks using TanStack React Query.
 * Every component should use these hooks instead of raw useEffect + API calls.
 * This ensures cache sharing, deduplication, and stale-while-revalidate behavior.
 */
import { useQuery } from '@tanstack/react-query';
import {
  inventoryAPI,
  categoriesAPI,
  suppliersAPI,
  dashboardAPI,
  salesAPI,
  reportsAPI,
  receivingAPI,
  usersAPI,
  notificationsAPI,
  settingsAPI,
  auditAPI,
  activityAPI,
} from '@/lib/api';

// ============================================================
// Static/Reference Data — long cache lifetime (24h)
// ============================================================

const STALE_TIME_STATIC = 24 * 60 * 60 * 1000; // 24 hours
const GC_TIME_STATIC = 48 * 60 * 60 * 1000; // 48 hours

/**
 * Get all categories — cached for 24h, changes very rarely
 */
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await categoriesAPI.getAll({ limit: 500 });
      return res.data?.items || [];
    },
    staleTime: STALE_TIME_STATIC,
    gcTime: GC_TIME_STATIC,
    placeholderData: [],
  });
}

/**
 * Get all suppliers — cached for 24h
 */
export function useSuppliers() {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const res = await suppliersAPI.getAll({ limit: 500 });
      return res.data?.items || [];
    },
    staleTime: STALE_TIME_STATIC,
    gcTime: GC_TIME_STATIC,
    placeholderData: [],
  });
}

/**
 * Get store settings — cached for 24h
 */
export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await settingsAPI.getAll();
      return res.data || {};
    },
    staleTime: STALE_TIME_STATIC,
    gcTime: GC_TIME_STATIC,
  });
}

/**
 * Get company info — cached for 24h
 */
export function useCompanyInfo() {
  return useQuery({
    queryKey: ['settings', 'company'],
    queryFn: async () => {
      const res = await settingsAPI.getCompanyInfo();
      return res.data || {};
    },
    staleTime: STALE_TIME_STATIC,
    gcTime: GC_TIME_STATIC,
  });
}

/**
 * Get user profile — cached for 1h
 */
export function useProfile() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const { authAPI } = await import('@/lib/api');
      const res = await authAPI.me();
      return res.data;
    },
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
  });
}

// ============================================================
// Products & Inventory — moderate cache (5 min)
// ============================================================

const STALE_TIME_NORMAL = 5 * 60 * 1000; // 5 minutes
const GC_TIME_NORMAL = 30 * 60 * 1000; // 30 minutes

/**
 * Get paginated/filtered products
 */
export function useProducts(filters = {}) {
  const { page = 1, limit = 20, search = '', category = '', supplier = '', stock_status = '', expiration_status = '' } = filters;
  return useQuery({
    queryKey: ['products', { page, limit, search, category, supplier, stock_status, expiration_status }],
    queryFn: async () => {
      const params = { page, limit };
      if (search) params.search = search;
      if (category) params.category = category;
      if (supplier) params.supplier = supplier;
      if (stock_status) params.stock_status = stock_status;
      if (expiration_status) params.expiration_status = expiration_status;
      const res = await inventoryAPI.getAll(params);
      return res.data;
    },
    staleTime: STALE_TIME_NORMAL,
    gcTime: GC_TIME_NORMAL,
    placeholderData: (prev) => prev, // Keep previous data while loading
  });
}

/**
 * Get a single product by ID
 */
export function useProduct(id) {
  return useQuery({
    queryKey: ['products', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await inventoryAPI.getById(id);
      return res.data;
    },
    enabled: !!id,
    staleTime: STALE_TIME_NORMAL,
    gcTime: GC_TIME_NORMAL,
  });
}

/**
 * Search products (for POS) — shorter cache, depends on search query
 */
export function useProductSearch(query, category = '', enabled = true) {
  return useQuery({
    queryKey: ['products', 'search', query, category],
    queryFn: async () => {
      if (!query) return [];
      const params = { search: query, limit: 20 };
      if (category) params.category = category;
      const res = await inventoryAPI.getAll(params);
      return res.data.items || [];
    },
    enabled: enabled && !!query,
    staleTime: 60 * 1000, // 1 minute for search results
    gcTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

// ============================================================
// Dashboard — moderate cache (2 min for fresh data)
// ============================================================

const STALE_TIME_DASHBOARD = 2 * 60 * 1000; // 2 minutes

/**
 * Get all dashboard data in one hook
 */
export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const [summaryRes, graphRes, dailyRes, catRes, itemRes] = await Promise.all([
        dashboardAPI.getSummary(),
        dashboardAPI.getGraph(),
        dashboardAPI.getDailySales(),
        dashboardAPI.getCategorySales(),
        dashboardAPI.getItemSales(),
      ]);

      const graphData = graphRes.data?.data || graphRes.data?.labels?.map((l, i) => ({
        label: l,
        sales: graphRes.data?.values?.[i] || 0,
        count: graphRes.data?.counts?.[i] || 0,
      })) || [];

      return {
        summary: summaryRes.data,
        graphData,
        dailySales: dailyRes.data,
        categorySales: catRes.data,
        bestSellers: itemRes.data || [],
      };
    },
    staleTime: STALE_TIME_DASHBOARD,
    gcTime: GC_TIME_NORMAL,
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 min
    placeholderData: (prev) => prev,
  });
}

// ============================================================
// Sales & Transactions
// ============================================================

/**
 * Get sales list with filters
 */
export function useSales(filters = {}, options = {}) {
  const { page = 1, limit = 20, startDate, endDate } = filters;
  return useQuery({
    queryKey: ['sales', { page, limit, startDate, endDate }],
    queryFn: async () => {
      const params = { page, limit };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await salesAPI.getAll(params);
      return res.data;
    },
    staleTime: STALE_TIME_NORMAL,
    gcTime: GC_TIME_NORMAL,
    placeholderData: (prev) => prev,
    ...options,
  });
}

// ============================================================
// Reports
// ============================================================

/**
 * Get sales report data
 */
export function useSalesReport(filters = {}) {
  const { startDate, endDate, period = 'daily' } = filters;
  return useQuery({
    queryKey: ['reports', 'sales', { startDate, endDate, period }],
    queryFn: async () => {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await reportsAPI.getSales({ ...params, period });
      return res.data;
    },
    staleTime: STALE_TIME_NORMAL,
    gcTime: GC_TIME_NORMAL,
    placeholderData: (prev) => prev,
  });
}

/**
 * Get item sales report data
 */
export function useItemSalesReport(filters = {}) {
  const { startDate, endDate } = filters;
  return useQuery({
    queryKey: ['reports', 'item-sales', { startDate, endDate }],
    queryFn: async () => {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await reportsAPI.getItemSales(params);
      return res.data;
    },
    staleTime: STALE_TIME_NORMAL,
    gcTime: GC_TIME_NORMAL,
    placeholderData: (prev) => prev,
  });
}

/**
 * Get inventory report data
 */
export function useInventoryReport(filter = '') {
  return useQuery({
    queryKey: ['reports', 'inventory', filter],
    queryFn: async () => {
      const res = await reportsAPI.getInventory({ filter: filter || undefined });
      return res.data;
    },
    staleTime: STALE_TIME_NORMAL,
    gcTime: GC_TIME_NORMAL,
    placeholderData: (prev) => prev,
  });
}

/**
 * Get receiving report data
 */
export function useReceivingReport(filters = {}) {
  const { startDate, endDate, supplier_id } = filters;
  return useQuery({
    queryKey: ['reports', 'receiving', { startDate, endDate, supplier_id }],
    queryFn: async () => {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (supplier_id) params.supplier_id = supplier_id;
      const res = await reportsAPI.getReceiving(params);
      return res.data;
    },
    staleTime: STALE_TIME_NORMAL,
    gcTime: GC_TIME_NORMAL,
    placeholderData: (prev) => prev,
  });
}

// ============================================================
// Receiving
// ============================================================

export function useReceivingList(filters = {}) {
  const { page = 1, limit = 20 } = filters;
  return useQuery({
    queryKey: ['receiving', { page, limit }],
    queryFn: async () => {
      const res = await receivingAPI.getAll({ page, limit });
      return res.data;
    },
    staleTime: STALE_TIME_NORMAL,
    gcTime: GC_TIME_NORMAL,
    placeholderData: (prev) => prev,
  });
}

export function useReceiving(id) {
  return useQuery({
    queryKey: ['receiving', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await receivingAPI.getById(id);
      return res.data;
    },
    enabled: !!id,
    staleTime: STALE_TIME_NORMAL,
    gcTime: GC_TIME_NORMAL,
  });
}

// ============================================================
// Users
// ============================================================

export function useUsers(filters = {}) {
  const { page = 1, limit = 20, search = '' } = filters;
  return useQuery({
    queryKey: ['users', { page, limit, search }],
    queryFn: async () => {
      const params = { page, limit };
      if (search) params.search = search;
      const res = await usersAPI.getAll(params);
      return res.data;
    },
    staleTime: STALE_TIME_NORMAL,
    gcTime: GC_TIME_NORMAL,
    placeholderData: (prev) => prev,
  });
}

// ============================================================
// Notifications
// ============================================================

export function useNotifications(filters = {}) {
  const { page = 1, limit = 50 } = filters;
  return useQuery({
    queryKey: ['notifications', { page, limit }],
    queryFn: async () => {
      const res = await notificationsAPI.getAll({ page, limit });
      return res.data;
    },
    staleTime: 60 * 1000, // 1 minute — notifications should be fresh
    gcTime: 5 * 60 * 1000,
    refetchInterval: 30 * 1000, // Poll every 30 seconds
    placeholderData: (prev) => prev,
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const res = await notificationsAPI.getUnreadCount();
      return res.data?.count || 0;
    },
    staleTime: 30 * 1000,
    gcTime: 60 * 1000,
    refetchInterval: 30 * 1000,
    placeholderData: (prev) => prev,
  });
}

// ============================================================
// Audit Logs
// ============================================================

export function useAuditLogs(filters = {}) {
  const { page = 1, limit = 50 } = filters;
  return useQuery({
    queryKey: ['audit-logs', { page, limit }],
    queryFn: async () => {
      const res = await auditAPI.getAll({ page, limit });
      return res.data;
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

// ============================================================
// Activity
// ============================================================

export function useActivity(filters = {}) {
  const { page = 1, limit = 50 } = filters;
  return useQuery({
    queryKey: ['activity', { page, limit }],
    queryFn: async () => {
      const res = await activityAPI.getActivity({ page, limit });
      return res.data;
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

export function useActiveUsers() {
  return useQuery({
    queryKey: ['activity', 'active-users'],
    queryFn: async () => {
      const res = await activityAPI.getActiveUsers();
      return res.data || [];
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000,
  });
}

export function useSystemHealth() {
  return useQuery({
    queryKey: ['activity', 'system-health'],
    queryFn: async () => {
      const res = await activityAPI.getSystemHealth();
      return res.data || {};
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000,
  });
}