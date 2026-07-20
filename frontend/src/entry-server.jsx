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
 * Global SSR timeout — 8 seconds.
 * Vercel serverless functions timeout at 10s, so we need breathing room
 * for reading static files, rendering, and sending the response.
 */
const SSR_TIMEOUT = 8000;

/**
 * Wraps a promise with a timeout that rejects after the given ms.
 */
function withTimeout(promise, ms, label = 'operation') {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`SSR timeout: ${label} exceeded ${ms}ms`)), ms)
    ),
  ]);
}

/**
 * Creates a server-side QueryClient with optimized defaults.
 * No persistence on server — data is dehydrated and sent to client.
 */
function createServerQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 0, // Don't retry during SSR — just fall through to client fetch
        refetchOnWindowFocus: false,
        staleTime: 10 * 60 * 1000,
        gcTime: 5 * 60 * 1000, // GC after 5 min to prevent memory leaks
      },
    },
  });
}

/**
 * Prefetch critical data for a given route.
 * This runs during SSR to populate the query cache before rendering.
 * All prefetches have a per-group timeout to prevent hanging.
 */
const PREFETCH_TIMEOUT = 4000; // 4s max for all prefetches per route

async function prefetchRouteData(queryClient, url, auth) {
  const pathname = new URL(url, 'http://localhost').pathname;

  // Only prefetch for authenticated routes
  if (!auth?.isAuthenticated) return;

  // Shared static data prefetch (used across many routes)
  const prefetchCategories = () =>
    queryClient.prefetchQuery({
      queryKey: ['categories'],
      queryFn: async () => {
        const { categoriesService } = await import('@/services');
        return categoriesService.getAll({ limit: 500 });
      },
      staleTime: 24 * 60 * 60 * 1000,
    });

  const prefetchSuppliers = () =>
    queryClient.prefetchQuery({
      queryKey: ['suppliers'],
      queryFn: async () => {
        const { suppliersService } = await import('@/services');
        return suppliersService.getAll({ limit: 500 });
      },
      staleTime: 24 * 60 * 60 * 1000,
    });

  try {
    // Dashboard — prefetch all dashboard data
    if (pathname === '/' || pathname === '/dashboard') {
      await withTimeout(
        Promise.allSettled([
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
              return { summary, graphData: graph, dailySales, categorySales: categorySalesData, bestSellers: itemSalesData || [] };
            },
            staleTime: 2 * 60 * 1000,
          }),
          prefetchCategories(),
          prefetchSuppliers(),
        ]),
        PREFETCH_TIMEOUT,
        'dashboard prefetch'
      );
    }

    // Products/Inventory
    if (pathname === '/inventory') {
      await withTimeout(
        Promise.allSettled([
          queryClient.prefetchQuery({
            queryKey: ['products', { page: 1, limit: 20, search: '', category: '', supplier: '', stock_status: '', expiration_status: '' }],
            queryFn: async () => {
              const { productsService } = await import('@/services');
              return productsService.getAll({ page: 1, limit: 20 });
            },
            staleTime: 5 * 60 * 1000,
          }),
          prefetchCategories(),
          prefetchSuppliers(),
        ]),
        PREFETCH_TIMEOUT,
        'inventory prefetch'
      );
    }

    // POS — prefetch products for search
    if (pathname === '/pos') {
      await withTimeout(prefetchCategories(), PREFETCH_TIMEOUT, 'pos prefetch');
    }

    // Reports
    if (pathname === '/reports') {
      await withTimeout(
        Promise.allSettled([
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
        ]),
        PREFETCH_TIMEOUT,
        'reports prefetch'
      );
    }

    // Users
    if (pathname === '/users') {
      await withTimeout(
        queryClient.prefetchQuery({
          queryKey: ['users', { page: 1, limit: 20, search: '' }],
          queryFn: async () => {
            const { usersService } = await import('@/services');
            return usersService.getAll({ page: 1, limit: 20 });
          },
          staleTime: 5 * 60 * 1000,
        }),
        PREFETCH_TIMEOUT,
        'users prefetch'
      );
    }

    // Receiving
    if (pathname === '/receiving') {
      await withTimeout(
        queryClient.prefetchQuery({
          queryKey: ['receiving', { page: 1, limit: 20 }],
          queryFn: async () => {
            const { receivingService } = await import('@/services');
            return receivingService.getAll({ page: 1, limit: 20 });
          },
          staleTime: 5 * 60 * 1000,
        }),
        PREFETCH_TIMEOUT,
        'receiving prefetch'
      );
    }
  } catch (err) {
    // Timeout or error during prefetch — log and continue.
    // The client will fetch the data itself via the cached hooks.
    console.warn(`[SSR] Prefetch warning (${pathname}): ${err.message}`);
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

  // Prefetch route data (with timeout — won't block render if slow)
  await prefetchRouteData(queryClient, url, auth);

  // Render the app to string (with global timeout)
  const html = await withTimeout(
    Promise.resolve(
      renderToString(
        <QueryClientProvider client={queryClient}>
          <AuthProvider initialAuth={auth}>
            <StaticRouter location={url}>
              <App />
            </StaticRouter>
          </AuthProvider>
        </QueryClientProvider>
      )
    ),
    SSR_TIMEOUT,
    'renderToString'
  );

  // Dehydrate query cache for client hydration
  const queryState = dehydrate(queryClient);

  return {
    html,
    queryState,
    auth,
  };
}
