import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import { jwtDecode } from 'jwt-decode';

/**
 * Single source of truth for authentication state.
 *
 * Previously App and Navbar each read localStorage on mount and relied on a
 * manually dispatched `storage` event to stay in sync. That event does not
 * fire in the tab that wrote the value, so the two could disagree.
 *
 * This context owns the state, listens for both same-tab (`auth:changed`) and
 * cross-tab (`storage`) updates, and proactively expires the session on a
 * timer instead of waiting for the next API call to return 401.
 */

const AuthContext = createContext(null);

export const AUTH_EVENT = 'auth:changed';

/** Notify the provider that stored credentials changed in this tab. */
export const notifyAuthChanged = () => {
  window.dispatchEvent(new Event(AUTH_EVENT));
};

const readSession = () => {
  const token = localStorage.getItem('token');
  if (!token) return null;

  try {
    const decoded = jwtDecode(token);
    // `exp` is in seconds since the epoch.
    if (!decoded.exp || decoded.exp * 1000 <= Date.now()) return null;

    return {
      token,
      role: localStorage.getItem('role') || null,
      username: decoded.sub || localStorage.getItem('username') || null,
      expiresAt: decoded.exp * 1000
    };
  } catch {
    // Malformed token — treat as signed out.
    return null;
  }
};

const clearStoredSession = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  localStorage.removeItem('username');
  localStorage.removeItem('driverInfo');
};

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(() => {
    // Clear on the initial read too, not just in sync(): an expired or
    // malformed token would otherwise sit in localStorage and be attached to
    // the next API call, which comes back 401.
    const initial = readSession();
    if (!initial) clearStoredSession();
    return initial;
  });

  const sync = useCallback(() => {
    const next = readSession();
    if (!next) clearStoredSession();
    setSession(next);
  }, []);

  const login = useCallback(({ token, role, username, driverInfo }) => {
    localStorage.setItem('token', token);
    if (role) localStorage.setItem('role', role);
    if (username) localStorage.setItem('username', username);
    if (driverInfo) localStorage.setItem('driverInfo', JSON.stringify(driverInfo));
    sync();
  }, [sync]);

  const logout = useCallback(() => {
    clearStoredSession();
    setSession(null);
  }, []);

  // Re-read whenever credentials change here or in another tab.
  useEffect(() => {
    window.addEventListener(AUTH_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(AUTH_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, [sync]);

  // Expire the session the moment the token lapses, rather than leaving a
  // signed-out user looking at a populated screen until their next request.
  useEffect(() => {
    if (!session) return undefined;
    const msRemaining = session.expiresAt - Date.now();
    if (msRemaining <= 0) {
      logout();
      return undefined;
    }
    const timer = setTimeout(logout, msRemaining);
    return () => clearTimeout(timer);
  }, [session, logout]);

  const value = useMemo(() => ({
    session,
    isAuthenticated: Boolean(session),
    role: session?.role ?? null,
    username: session?.username ?? null,
    isAdmin: session?.role === 'ADMIN',
    isDriver: session?.role === 'DRIVER',
    login,
    logout
  }), [session, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
