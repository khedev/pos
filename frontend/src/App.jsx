/**
 * Root App component.
 * SSR-compatible shell that renders the application routes.
 *
 * The router context (BrowserRouter or StaticRouter) and data providers
 * (QueryClientProvider, AuthProvider) are set up in the entry points:
 *   - entry-client.jsx for client-side hydration
 *   - entry-server.jsx for server-side rendering
 *
 * This component just needs to render the routes.
 */
import React from 'react';
import { AppRoutes } from '@/routes';
import ErrorBoundary from '@/components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <AppRoutes />
    </ErrorBoundary>
  );
}

export default App;