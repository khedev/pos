/**
 * AuthProvider — bridges server-side auth state to client-side Zustand store.
 *
 * On the server:
 * - Reads auth from cookies (via SSR utilities)
 * - Passes initial auth state to the React tree
 *
 * On the client:
 * - On first hydration, syncs server auth state into Zustand store
 * - After hydration, the Zustand store takes over auth management
 * - Auth cookies are set by the server on login and sent with every request
 *
 * This ensures:
 * - SSR renders the correct UI for authenticated users
 * - No flash of login page on first load
 * - Seamless transition from SSR to SPA auth
 */
import React, { useEffect, useRef } from 'react';
import useAuthStore from '@/store/authStore';

/**
 * Context to pass initial auth state from server to client.
 * Only used during SSR hydration — after that, Zustand store is the source of truth.
 */
const AuthContext = React.createContext(null);

export function AuthProvider({ children, initialAuth }) {
  const hasInitialized = useRef(false);
  const setUser = useAuthStore((state) => state.setUser);
  const setToken = useAuthStore((state) => state.setToken);
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);

  // On first mount (hydration), sync server auth state to Zustand store
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    if (initialAuth) {
      const { user, token, isAuthenticated } = initialAuth;

      // Only set if the store doesn't already have auth (e.g., from localStorage)
      const currentToken = useAuthStore.getState().token;
      if (!currentToken && token) {
        setToken(token);
        setAuthenticated(isAuthenticated);
        if (user) {
          setUser(user);
        }
      }
    }
  }, [initialAuth, setUser, setToken, setAuthenticated]);

  return (
    <AuthContext.Provider value={initialAuth}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  return React.useContext(AuthContext);
}