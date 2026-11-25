import React, { createContext, useContext, useEffect, useState } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import api from '../../config/api';

const GoogleConfigContext = createContext({
  googleClientId: '',
  googleEnabled: false,
  loading: true,
});

export function useGoogleAuthConfig() {
  return useContext(GoogleConfigContext);
}

/**
 * Loads the public Google OAuth Client ID once from backend (/api/auth/public-config)
 * so Google OAuth is configured in a single place (bms-backend/.env).
 * Falls back to VITE_GOOGLE_CLIENT_ID if explicitly set on the frontend.
 */
export function GoogleConfigProvider({ children }) {
  const fallbackClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
  const [state, setState] = useState({
    googleClientId: fallbackClientId,
    googleEnabled: Boolean(fallbackClientId),
    loading: !fallbackClientId,
  });

  useEffect(() => {
    let mounted = true;
    api
      .get('/auth/public-config')
      .then((res) => {
        if (!mounted) return;
        const fromBe = String(res?.data?.googleClientId || '').trim();
        const resolved = fromBe || fallbackClientId;
        setState({
          googleClientId: resolved,
          googleEnabled: Boolean(resolved),
          loading: false,
        });
      })
      .catch(() => {
        if (!mounted) return;
        setState((prev) => ({ ...prev, loading: false }));
      });

    return () => {
      mounted = false;
    };
  }, [fallbackClientId]);

  const content = state.googleClientId ? (
    <GoogleOAuthProvider clientId={state.googleClientId}>{children}</GoogleOAuthProvider>
  ) : (
    children
  );

  return <GoogleConfigContext.Provider value={state}>{content}</GoogleConfigContext.Provider>;
}
