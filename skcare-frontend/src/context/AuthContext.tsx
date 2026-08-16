// context/AuthContext.tsx
import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
  ReactNode,
} from 'react';
import { jwtDecode } from 'jwt-decode';

const API = import.meta.env.VITE_APP_API_BASE_URL || 'http://localhost:5000';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id:         string;
  email:      string;
  name?:      string;
  photoURL?:  string;
  roles:      string[];
  topRole:    'user' | 'staff' | 'admin' | 'superadmin';
  isGuest:    boolean;
  isVerified: boolean;
}

interface JwtPayload {
  sub:     string;
  exp:     number;
  isGuest?: boolean;
}

interface AuthContextType {
  user:           AuthUser | null;
  accessToken:    string | null;
  isLoading:      boolean;
  signUp:         (email: string, password: string, name?: string) => Promise<void>;
  signIn:         (email: string, password: string) => Promise<void>;
  guestSignIn:    () => Promise<void>;
  convertGuest:   (email: string, password: string, name?: string) => Promise<{ cartMerged?: boolean }>;
  signOut:        () => Promise<void>;
  getToken:       () => string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TOKEN_KEY   = 'skcare_access_token';
const REFRESH_KEY = 'skcare_refresh_token';

const saveTokens = (access: string, refresh?: string) => {
  sessionStorage.setItem(TOKEN_KEY, access);
  if (refresh) sessionStorage.setItem(REFRESH_KEY, refresh);
};

const clearTokens = () => {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
};

const getStoredToken   = () => sessionStorage.getItem(TOKEN_KEY);
const getRefreshToken  = () => sessionStorage.getItem(REFRESH_KEY);

/** Returns true if the JWT is expired (or will expire in the next 30 s). */
const isTokenExpired = (token: string): boolean => {
  try {
    const { exp } = jwtDecode<JwtPayload>(token);
    return exp * 1000 < Date.now() + 30_000;
  } catch {
    return true;
  }
};

/** POST helper — throws on non-2xx with the server error message. */
const apiPost = async (path: string, body?: object, token?: string | null) => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, {
    method:      'POST',
    headers,
    credentials: 'include', // send/receive httpOnly refresh token cookie cross-origin
    body:        body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json();
  if (!res.ok) {
    if (json.details && Array.isArray(json.details)) {
      const messages = json.details.map((d: { message: string }) => d.message).join(' · ');
      throw new Error(messages);
    }
    // Special case: 409 with cartMerged means email already exists
    // Caller (convertGuest) needs to inspect this — re-throw with metadata
    const err = new Error(json.message || 'Request failed') as Error & { cartMerged?: boolean; status?: number };
    err.status    = res.status;
    err.cartMerged = json.cartMerged ?? false;
    throw err;
  }
  return json;
};

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user,        setUser]        = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading,   setIsLoading]   = useState(true);

  // ── Restore session on mount ────────────────────────────────────────────────
  useEffect(() => {
    const restore = async () => {
      const stored = getStoredToken();
      if (!stored) { setIsLoading(false); return; }

      if (!isTokenExpired(stored)) {
        try {
          const res = await fetch(`${API}/api/users/me`, {
            headers:     { Authorization: `Bearer ${stored}` },
            credentials: 'include',
          });
          if (res.ok) {
            const { user: profile } = await res.json();

            // If restoring a guest session, clear their cart first —
            // this handles the case where they closed the tab and came back
            if (profile.isGuest) {
              await fetch(`${API}/api/auth/clear-guest-cart`, {
                method:      'POST',
                credentials: 'include',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization:  `Bearer ${stored}`,
                },
              }).catch(() => {});
            }

            setUser(profile);
            setAccessToken(stored);
          } else {
            await attemptRefresh();
          }
        } catch {
          clearTokens();
        }
      } else {
        await attemptRefresh();
      }

      setIsLoading(false);
    };

    restore();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Clear guest cart on tab/browser close ────────────────────────────────
  useEffect(() => {
    const handleUnload = () => {
      const token      = getStoredToken();
      const isGuestNow = user?.isGuest ?? false;
      if (!token || !isGuestNow) return;

      // sendBeacon fires reliably on tab close and doesn't block the unload.
      // We include the token in the body because sendBeacon can't set headers.
      const url  = `${API}/api/auth/clear-guest-cart`;
      const blob = new Blob(
        [JSON.stringify({ token })],
        { type: 'application/json' }
      );
      navigator.sendBeacon(url, blob);

      // Clear tokens locally so the session doesn't restore on next visit
      clearTokens();
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [user]);

  // ── Silent token refresh ────────────────────────────────────────────────────
  const attemptRefresh = useCallback(async (): Promise<boolean> => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) { clearTokens(); return false; }

    try {
      const data = await apiPost('/api/auth/refresh', { refreshToken });
      saveTokens(data.accessToken, data.refreshToken);
      setAccessToken(data.accessToken);

      // Re-fetch profile with new token
      const res = await fetch(`${API}/api/users/me`, {
        headers:     { Authorization: `Bearer ${data.accessToken}` },
        credentials: 'include',
      });
      if (res.ok) {
        const { user: profile } = await res.json();
        setUser(profile);
        return true;
      }
    } catch {
      clearTokens();
      setUser(null);
      setAccessToken(null);
    }
    return false;
  }, []);

  // ── Sign Up ─────────────────────────────────────────────────────────────────
  const signUp = async (email: string, password: string, name?: string) => {
    const data = await apiPost('/api/auth/signup', { email, password, name });
    saveTokens(data.accessToken, data.refreshToken);
    setAccessToken(data.accessToken);
    setUser(data.user);
  };

  // ── Sign In ─────────────────────────────────────────────────────────────────
  const signIn = async (email: string, password: string) => {
    const data = await apiPost('/api/auth/signin', { email, password });
    saveTokens(data.accessToken, data.refreshToken);
    setAccessToken(data.accessToken);
    setUser(data.user);
  };

  // ── Guest Sign In ───────────────────────────────────────────────────────────
  // Signs in directly with the seeded guest credentials stored in frontend env vars.
  // Calls the normal signin endpoint — no special /api/auth/guest endpoint needed.
  // The guest account must be seeded first: npm run seed:guest (in skcare-api)
  const guestSignIn = async () => {
    const guestEmail    = import.meta.env.VITE_GUEST_EMAIL    || 'guest@skcare.com';
    const guestPassword = import.meta.env.VITE_GUEST_PASSWORD || 'Guest@skcare1';
    // Sign in exactly like a normal user — guest account just has isGuest:true in DB
    const data = await apiPost('/api/auth/signin', {
      email:    guestEmail,
      password: guestPassword,
    });
    saveTokens(data.accessToken, data.refreshToken);
    setAccessToken(data.accessToken);
    setUser(data.user);
  };

  // ── Convert Guest → New Real Account ───────────────────────────────────────
  /**
   * Called at checkout when a guest provides real credentials.
   *
   * Creates a BRAND NEW user account. The shared guest account is NEVER touched.
   *
   * Case A — fresh email:
   *   New account created, guest cart transferred, guest cart cleared.
   *   New account tokens issued. User is signed in as the new real account.
   *
   * Case B — email already registered:
   *   Guest cart merged into existing account's cart, guest cart cleared.
   *   Returns { cartMerged: true } so caller can show "please sign in".
   */
  const convertGuest = async (
    email: string,
    password: string,
    name?: string
  ): Promise<{ cartMerged?: boolean }> => {
    const token = getStoredToken();
    try {
      const data = await apiPost('/api/auth/register-from-guest', { email, password, name }, token);
      // Success — sign out guest session, sign in as new real account
      clearTokens();
      saveTokens(data.accessToken, data.refreshToken);
      setAccessToken(data.accessToken);
      setUser(data.user);
      return {};
    } catch (err: unknown) {
      const e = err as Error & { cartMerged?: boolean; status?: number };
      if (e.status === 409 && e.cartMerged) {
        // Email already exists — cart was merged into existing account, guest cart cleared
        // Sign out guest session — user needs to sign in with their existing account
        clearTokens();
        setUser(null);
        setAccessToken(null);
        return { cartMerged: true };
      }
      throw err;
    }
  };

  // ── Sign Out ────────────────────────────────────────────────────────────────
  const signOut = async () => {
    const token   = getStoredToken();
    const isGuest = user?.isGuest ?? false;
    try {
      if (token) {
        // If guest — clear their cart on the server before signing out
        if (isGuest) {
          await apiPost('/api/auth/clear-guest-cart', undefined, token).catch(() => {});
        }
        await apiPost('/api/auth/signout', undefined, token);
      }
    } catch {
      // Sign out locally even if the server call fails
    } finally {
      clearTokens();
      setUser(null);
      setAccessToken(null);
    }
  };

  // ── Get current token (sync — for use in fetch/axios headers) ───────────────
  const getToken = (): string | null => getStoredToken();

  return (
    <AuthContext.Provider
      value={{ user, accessToken, isLoading, signUp, signIn, guestSignIn, convertGuest, signOut, getToken }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
