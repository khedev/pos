/**
 * Client-side entry point for SSR hydration.
 * Hydrates the server-rendered React app and takes over for SPA navigation.
 *
 * On initial load:
 * 1. Hydrates the React tree from server-rendered HTML
 * 2. Rehydrates TanStack Query cache from __INITIAL_QUERY_STATE__
 * 3. Rehydrates auth state from __INITIAL_AUTH_STATE__
 * 4. Switches from StaticRouter to BrowserRouter for SPA navigation
 */
import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { hydrate } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { AuthProvider } from './components/AuthProvider';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

/**
 * Create client-side QueryClient with persistence.
 * Persisted cache allows offline-like performance on return visits.
 */
function createClientQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 2,
        refetchOnWindowFocus: false,
        staleTime: 10 * 60 * 1000,
        gcTime: 24 * 60 * 60 * 1000,
        refetchOnMount: true, // Re-fetch if stale after SSR
        refetchOnReconnect: true,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
      mutations: {
        retry: 1,
        retryDelay: 1000,
      },
    },
  });
}

// Get initial data injected by the server
const initialQueryState = window.__INITIAL_QUERY_STATE__;
const initialAuthState = window.__INITIAL_AUTH_STATE__;

// Clean up global to prevent re-use
delete window.__INITIAL_QUERY_STATE__;
delete window.__INITIAL_AUTH_STATE__;

const queryClient = createClientQueryClient();

// Hydrate the query cache with server-prefetched data
if (initialQueryState) {
  hydrate(queryClient, initialQueryState);
}

// Persist query cache to localStorage (client-side only)
const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'PGPOS_QUERY_CACHE',
  throttleTime: 1000,
});

function ClientApp() {
  return (
    <ErrorBoundary>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: 24 * 60 * 60 * 1000,
          buster: 'v2',
        }}
      >
        <AuthProvider initialAuth={initialAuthState}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AuthProvider>
        <Toaster position="top-right" />
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </PersistQueryClientProvider>
    </ErrorBoundary>
  );
}

// Hydrate the server-rendered root
hydrateRoot(document.getElementById('root'), <ClientApp />);