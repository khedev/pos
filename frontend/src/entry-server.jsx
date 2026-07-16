/**
 * Server-side entry point for SSR.
 * Renders the React app to HTML string on the server.
 * Supports:
 * - Route-based rendering
 * - TanStack Query prefetching and dehydration
 * - Auth state from cookies
 * - SEO meta tags
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { dehydrate } from '@tanstack/react-query';
import App from './App';
import { AuthProvider } from './components/AuthProvider';
import { createFetchHeaders, getAuthFromCookies } from './lib/ssr-utils';

/**
 * Creates a server-side QueryClient with optimized defaults.
 * No persistence on server — data is dehydrated and sent to client.
 */
function createServerQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
        staleTime: 10 * 60 * 1000,
        gcTime: Infinity, // Don't garbage collect during SSR
      },
    },
  });
}

/**
 * Prefetch critical data for a given route.
 * This runs during SSR to populate the query cache before rendering.
 */
async function prefetchRouteData(queryClient, url, auth) {
  const pathname = new URL(url, 'http://localhost').pathname;

  // Only prefetch for authenticated routes
  if (!auth?.isAuthenticated) return;

  // Dashboard — prefetch all dashboard data
  if (pathname === '/' || pathname === '/dashboard') {
    await Promise.allSettled([
      queryClient.prefetchQuery({
        queryKey: ['dashboard'],
        queryFn: async () => {
          const { dashboardService } = await import('@/services');
          const [summary, graphData, dailySales, categorySalesData, itemSalesData] = await Promise.all([
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
            summary,
            graphData: graph,
            dailySales,
            categorySales: categorySalesData,
            bestSellers: itemSalesData || [],
          };
        },
        staleTime: 2 * 60 * 1000,
      }),
      queryClient.prefetchQuery({
        queryKey: ['categories'],
        queryFn: async () => {
          const { categoriesService } = await import('@/services');
          return categoriesService.getAll({ limit: 500 });
        },
        staleTime: 24 * 60 * 60 * 1000,
      }),
      queryClient.prefetchQuery({
        queryKey: ['suppliers'],
        queryFn: async () => {
          const { suppliersService } = await import('@/services');
          return suppliersService.getAll({ limit: 500 });
        },
        staleTime: 24 * 60 * 60 * 1000,
      }),
    ]);
  }

  // Products/Inventory
  if (pathname === '/inventory') {
    await queryClient.prefetchQuery({
      queryKey: ['products', { page: 1, limit: 20, search: '', category: '', supplier: '', stock_status: '', expiration_status: '' }],
      queryFn: async () => {
        const { productsService } = await import('@/services');
        return productsService.getAll({ page: 1, limit: 20 });
      },
      staleTime: 5 * 60 * 1000,
    });
  }

  // POS — prefetch products for search
  if (pathname === '/pos') {
    await queryClient.prefetchQuery({
      queryKey: ['categories'],
      queryFn: async () => {
        const { categoriesService } = await import('@/services');
        return categoriesService.getAll({ limit: 500 });
      },
      staleTime: 24 * 60 * 60 * 1000,
    });
  }

  // Reports
  if (pathname === '/reports') {
    await Promise.allSettled([
      queryClient.prefetchQuery({
        queryKey: ['reports', 'sales', {}],
        queryFn: async () => {
          const { reportsService } = await import('@/services');
          return reportsService.getSales({});
        },
        staleTime: 5 * 60 * 1000,
      }),
      queryClient.prefetchQuery({
        queryKey: ['reports', 'inventory', ''],
        queryFn: async () => {
          const { reportsService } = await import('@/services');
          return reportsService.getInventory({});
        },
        staleTime: 5 * 60 * 1000,
      }),
    ]);
  }

  // Users
  if (pathname === '/users') {
    await queryClient.prefetchQuery({
      queryKey: ['users', { page: 1, limit: 20, search: '' }],
      queryFn: async () => {
        const { usersService } = await import('@/services');
        return usersService.getAll({ page: 1, limit: 20 });
      },
      staleTime: 5 * 60 * 1000,
    });
  }

  // Receiving
  if (pathname === '/receiving') {
    await queryClient.prefetchQuery({
      queryKey: ['receiving', { page: 1, limit: 20 }],
      queryFn: async () => {
        const { receivingService } = await import('@/services');
        return receivingService.getAll({ page: 1, limit: 20 });
      },
      staleTime: 5 * 60 * 1000,
    });
  }
}

/**
 * Main SSR render function.
 * Called by the Vercel serverless function.
 *
 * @param {string} url - The full request URL
 * @param {Object} options
 * @param {Object} [options.cookies] - Parsed cookies for auth
 * @returns {Promise<{html: string, queryState: Object, head: string}>}
 */
export async function render(url, options = {}) {
  const { cookies = {} } = options;

  // Extract auth from cookies
  const auth = getAuthFromCookies(cookies);

  // Create server-side query client
  const queryClient = createServerQueryClient();

  // Prefetch route data
  await prefetchRouteData(queryClient, url, auth);

  // Render the app to string
  const html = renderToString(
    <QueryClientProvider client={queryClient}>
      <AuthProvider initialAuth={auth}>
        <StaticRouter location={url}>
          <App />
        </StaticRouter>
      </AuthProvider>
    </QueryClientProvider>
  );

  // Dehydrate query cache for client hydration
  const queryState = dehydrate(queryClient);

  return {
    html,
    queryState,
    auth,
  };
}