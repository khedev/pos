/**
 * Centralized data fetching hooks using TanStack React Query.
 * Every component should use these hooks instead of raw useEffect + API calls.
 * This ensures cache sharing, deduplication, and stale-while-revalidate behavior.
 *
 * All queryFn implementations delegate to the service layer (services/*)
 * to keep API call logic separate from hook logic.
 */
import { useQuery } from '@tanstack/react-query';
import {
  productsService,
  categoriesService,
  suppliersService,
  dashboardService,
  salesService,
  reportsService,
  receivingService,
  usersService,
} from '@/services';

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
    queryFn: () => categoriesService.getAll({ limit: 500 }),
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
    queryFn: () => suppliersService.getAll({ limit: 500 }),
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
      const { settingsAPI } = await import('@/lib/api');
      const res = await settingsAPI.getAll();
      // Backend returns a flat object: { key: value, ... }
      return res.data || {};
    },
    staleTime: STALE_TIME_STATIC,
    gcTime: GC_TIME_STATIC,
    placeholderData: {},
  });
}

/**
 * Get company info — cached for 24h
 */
export function useCompanyInfo() {
  return useQuery({
    queryKey: ['settings', 'company'],
    queryFn: async () => {
      const { settingsAPI } = await import('@/lib/api');
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
    queryFn: () => productsService.getAll({ page, limit, search, category, supplier, stock_status, expiration_status }),
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
    queryFn: () => productsService.getById(id),
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
    queryFn: () => productsService.search(query, category, 20),
    enabled: enabled && !!query,
    staleTime: 60 * 1000, // 1 minute for search results
    gcTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

// ============================================================
// Categories — paginated for management page
// ============================================================

/**
 * Get paginated/filtered categories for the management page
 */
export function useCategoriesPaginated(filters = {}) {
  const { page = 1, limit = 20, search = '' } = filters;
  return useQuery({
    queryKey: ['categories', 'paginated', { page, limit, search }],
    queryFn: async () => {
      const { categoriesAPI } = await import('@/lib/api');
      const res = await categoriesAPI.getAll({ page, limit, search });
      return { items: res.data?.items || res.data || [], total: res.data?.total || 0, totalPages: res.data?.totalPages || 0 };
    },
    staleTime: STALE_TIME_NORMAL,
    gcTime: GC_TIME_NORMAL,
    placeholderData: (prev) => prev,
  });
}

// ============================================================
// Suppliers — paginated for management page
// ============================================================

/**
 * Get searchable suppliers for the management page
 */
export function useSuppliersPaginated(filters = {}) {
  const { search = '' } = filters;
  return useQuery({
    queryKey: ['suppliers', 'paginated', { search }],
    queryFn: async () => {
      const { suppliersAPI } = await import('@/lib/api');
      const res = await suppliersAPI.getAll({ search });
      return { items: res.data?.items || res.data || [], total: res.data?.total || 0 };
    },
    staleTime: STALE_TIME_NORMAL,
    gcTime: GC_TIME_NORMAL,
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
      const [summaryRes, graphData, dailySales, categorySalesData, itemSalesData] = await Promise.all([
        dashboardService.getSummary(),
        dashboardService.getGraph(),
        dashboardService.getDailySales(),
        dashboardService.getCategorySales(),
        dashboardService.getItemSales(),
      ]);

      const graph = graphData?.data || graphData?.labels?.map((l, i) => ({
        label: l,
        sales: graphData?.values?.[i] || 0,
        count: graphData?.counts?.[i] || 0,
      })) || [];

      return {
        summary: summaryRes,
        graphData: graph,
        dailySales,
        categorySales: categorySalesData,
        bestSellers: itemSalesData || [],
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
    queryFn: () => salesService.getAll({ page, limit, startDate, endDate }),
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
    queryFn: () => reportsService.getSales({ startDate, endDate, period }),
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
    queryFn: () => reportsService.getItemSales({ startDate, endDate }),
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
    queryFn: () => reportsService.getInventory({ filter: filter || undefined }),
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
    queryFn: () => reportsService.getReceiving({ startDate, endDate, supplier_id }),
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
    queryFn: () => receivingService.getAll({ page, limit }),
    staleTime: STALE_TIME_NORMAL,
    gcTime: GC_TIME_NORMAL,
    placeholderData: (prev) => prev,
  });
}

export function useReceiving(id) {
  return useQuery({
    queryKey: ['receiving', id],
    queryFn: () => receivingService.getById(id),
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
    queryFn: () => usersService.getAll({ page, limit, search }),
    staleTime: STALE_TIME_NORMAL,
    gcTime: GC_TIME_NORMAL,
    placeholderData: (prev) => prev,
  });
}

// ============================================================
// Notifications / Activity / Audit — dynamic (short cache)
// ============================================================

export function useNotifications(filters = {}) {
  const { page = 1, limit = 50 } = filters;
  return useQuery({
    queryKey: ['notifications', { page, limit }],
    queryFn: async () => {
      const { notificationsAPI } = await import('@/lib/api');
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
      const { notificationsAPI } = await import('@/lib/api');
      const res = await notificationsAPI.getUnreadCount();
      return res.data?.count || 0;
    },
    staleTime: 30 * 1000,
    gcTime: 60 * 1000,
    refetchInterval: 30 * 1000,
    placeholderData: (prev) => prev,
  });
}

export function useAuditLogs(filters = {}) {
  const { page = 1, limit = 50, search = '', action = '', entity = '', startDate = '', endDate = '' } = filters;
  return useQuery({
    queryKey: ['audit-logs', { page, limit, search, action, entity, startDate, endDate }],
    queryFn: async () => {
      const { auditAPI } = await import('@/lib/api');
      const params = { page, limit, ...(search && { search }), ...(action && { action }), ...(entity && { entity }), ...(startDate && { startDate }), ...(endDate && { endDate }) };
      const res = await auditAPI.getAll(params);
      return res.data;
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

export function useActivity(filters = {}) {
  const { page = 1, limit = 50 } = filters;
  return useQuery({
    queryKey: ['activity', { page, limit }],
    queryFn: async () => {
      const { activityAPI } = await import('@/lib/api');
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
      const { activityAPI } = await import('@/lib/api');
      const res = await activityAPI.getActiveUsers();
      return res.data?.count || 0;
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
      const { activityAPI } = await import('@/lib/api');
      const res = await activityAPI.getSystemHealth();
      return res.data || { status: 'healthy', uptime: '0h', dbSize: '0 MB' };
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000,
  });
}