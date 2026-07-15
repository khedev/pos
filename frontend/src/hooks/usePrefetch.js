/**
 * Prefetching utilities for instant page navigation.
 * Preloads data on hover over nav links.
 */
import { useQueryClient } from '@tanstack/react-query';

export function usePrefetch() {
  const queryClient = useQueryClient();

  const prefetchDashboard = () => {
    queryClient.prefetchQuery({
      queryKey: ['dashboard'],
      staleTime: 2 * 60 * 1000,
    });
  };

  const prefetchProducts = () => {
    queryClient.prefetchQuery({
      queryKey: ['products', { page: 1, limit: 20, search: '', category: '', supplier: '', stock_status: '', expiration_status: '' }],
      staleTime: 5 * 60 * 1000,
    });
  };

  const prefetchCategories = () => {
    queryClient.prefetchQuery({
      queryKey: ['categories'],
      staleTime: 24 * 60 * 60 * 1000,
    });
  };

  const prefetchSuppliers = () => {
    queryClient.prefetchQuery({
      queryKey: ['suppliers'],
      staleTime: 24 * 60 * 60 * 1000,
    });
  };

  const prefetchSales = () => {
    queryClient.prefetchQuery({
      queryKey: ['sales', { page: 1, limit: 20 }],
      staleTime: 5 * 60 * 1000,
    });
  };

  const prefetchInventory = () => {
    queryClient.prefetchQuery({
      queryKey: ['reports', 'inventory', ''],
      staleTime: 5 * 60 * 1000,
    });
  };

  const prefetchNotifications = () => {
    queryClient.prefetchQuery({
      queryKey: ['notifications', { page: 1, limit: 50 }],
      staleTime: 60 * 1000,
    });
  };

  const prefetchActivity = () => {
    queryClient.prefetchQuery({
      queryKey: ['activity', { page: 1, limit: 50 }],
      staleTime: 60 * 1000,
    });
  };

  const prefetchUsers = () => {
    queryClient.prefetchQuery({
      queryKey: ['users', { page: 1, limit: 20, search: '' }],
      staleTime: 5 * 60 * 1000,
    });
  };

  const prefetchReceiving = () => {
    queryClient.prefetchQuery({
      queryKey: ['receiving', { page: 1, limit: 20 }],
      staleTime: 5 * 60 * 1000,
    });
  };

  const prefetchAuditLogs = () => {
    queryClient.prefetchQuery({
      queryKey: ['audit-logs', { page: 1, limit: 50 }],
      staleTime: 60 * 1000,
    });
  };

  const prefetchSettings = () => {
    queryClient.prefetchQuery({
      queryKey: ['settings'],
      staleTime: 24 * 60 * 60 * 1000,
    });
  };

  // Map path to prefetch function
  const prefetchPage = (path) => {
    switch (path) {
      case '/dashboard':
        prefetchDashboard();
        break;
      case '/pos':
        prefetchSales();
        break;
      case '/inventory':
        prefetchProducts();
        break;
      case '/receiving':
        prefetchReceiving();
        break;
      case '/categories':
        prefetchCategories();
        break;
      case '/suppliers':
        prefetchSuppliers();
        break;
      case '/reports':
        prefetchSales();
        break;
      case '/users':
        prefetchUsers();
        break;
      case '/settings':
        prefetchSettings();
        break;
      case '/notifications':
        prefetchNotifications();
        break;
      case '/activity':
        prefetchActivity();
        break;
      case '/audit-log':
        prefetchAuditLogs();
        break;
      default:
        break;
    }
  };

  return { prefetchPage };
}