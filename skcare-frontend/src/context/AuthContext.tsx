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
  localStorage.setItem(TOKEN_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
};

const clearTokens = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
};

const getStoredToken   = () => localStorage.getItem(TOKEN_KEY);
const getRefreshToken  = () => localStorage.getItem(REFRESH_KEY);

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

      // If the access token is still valid, fetch the user profile
      if (!isTokenExpired(stored)) {
        try {
          const res = await fetch(`${API}/api/users/me`, {
            headers:     { Authorization: `Bearer ${stored}` },
            credentials: 'include',
          });
          if (res.ok) {
            const { user: profile } = await res.json();
            setUser(profile);
            setAccessToken(stored);
          } else {
            // Token rejected — try refresh
            await attemptRefresh();
          }
        } catch {
          clearTokens();
        }
      } else {
        // Expired — try to silently refresh
        await attemptRefresh();
      }

      setIsLoading(false);
    };

    restore();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  // ── Convert Guest → Real Account ────────────────────────────────────────────
  /**
   * Called at checkout when a guest provides real credentials.
   *
   * Case A — email is fresh:
   *   The guest document is promoted in-place (same _id, cart retained).
   *   New full tokens are issued. User is logged in as their real account.
   *
   * Case B — email already registered:
   *   Guest cart is merged into the existing account's cart on the server.
   *   Guest session is deleted. Returns { cartMerged: true } so the
   *   caller can show a "please sign in" message.
   */
  const convertGuest = async (
    email: string,
    password: string,
    name?: string
  ): Promise<{ cartMerged?: boolean }> => {
    const token = getStoredToken();
    try {
      const data = await apiPost('/api/auth/convert', { email, password, name }, token);
      // Success — replace guest session with real account tokens
      clearTokens();
      saveTokens(data.accessToken, data.refreshToken);
      setAccessToken(data.accessToken);
      setUser(data.user);
      return {};
    } catch (err: unknown) {
      const e = err as Error & { cartMerged?: boolean; status?: number };
      if (e.status === 409 && e.cartMerged) {
        // Email already exists — cart was merged, guest session deleted
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
    const refresh = getRefreshToken();
    try {
      if (token) {
        await apiPost('/api/auth/signout', { refreshToken: refresh }, token);
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
