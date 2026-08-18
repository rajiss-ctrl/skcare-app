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
  isVerified: boolean;
}

interface JwtPayload {
  sub: string;
  exp: number;
}

interface AuthContextType {
  user:        AuthUser | null;
  accessToken: string | null;
  isLoading:   boolean;
  signUp:      (email: string, password: string, name?: string) => Promise<void>;
  signIn:      (email: string, password: string) => Promise<void>;
  signOut:     () => Promise<void>;
  getToken:    () => string | null;
  // For anonymous checkout — creates account + transfers sessionStorage cart
  registerAndCheckout: (
    email: string,
    password: string,
    name: string,
    cartItems: CartItemPayload[]
  ) => Promise<void>;
}

export interface CartItemPayload {
  productId: string;
  name:      string;
  imageUrl:  string;
  price:     number;
  quantity:  number;
}

// ─── Token storage (sessionStorage — tab-scoped, cleared on browser close) ───
// Access tokens live only in memory + sessionStorage. Never localStorage.
// Refresh token is an httpOnly cookie set by the server — JS cannot read it.

const TOKEN_KEY = 'skcare_token';

const saveToken   = (token: string) => sessionStorage.setItem(TOKEN_KEY, token);
const removeToken = ()              => sessionStorage.removeItem(TOKEN_KEY);
const readToken   = ()              => sessionStorage.getItem(TOKEN_KEY);

const isExpired = (token: string): boolean => {
  try {
    const { exp } = jwtDecode<JwtPayload>(token);
    return exp * 1000 < Date.now() + 30_000; // 30s buffer
  } catch {
    return true;
  }
};

// ─── API helper ───────────────────────────────────────────────────────────────

const post = async (path: string, body?: object, token?: string | null) => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, {
    method:      'POST',
    headers,
    credentials: 'include', // sends/receives httpOnly refresh cookie
    body:        body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json();
  if (!res.ok) {
    if (json.details && Array.isArray(json.details)) {
      throw new Error(json.details.map((d: { message: string }) => d.message).join(' · '));
    }
    const err  = new Error(json.message || 'Request failed') as Error & { emailExists?: boolean; status?: number };
    err.status = res.status;
    err.emailExists = json.emailExists ?? false;
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

  // ── Apply a successful auth response ────────────────────────────────────────
  const applyAuth = (token: string, profile: AuthUser) => {
    saveToken(token);
    setAccessToken(token);
    setUser(profile);
  };

  // ── Silent refresh via httpOnly cookie ──────────────────────────────────────
  const attemptRefresh = useCallback(async (): Promise<boolean> => {
    try {
      const data = await post('/api/auth/refresh');
      const res  = await fetch(`${API}/api/users/me`, {
        headers:     { Authorization: `Bearer ${data.accessToken}` },
        credentials: 'include',
      });
      if (res.ok) {
        const { user: profile } = await res.json();
        applyAuth(data.accessToken, profile);
        return true;
      }
    } catch {
      removeToken();
      setUser(null);
      setAccessToken(null);
    }
    return false;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Restore session on mount ─────────────────────────────────────────────────
  useEffect(() => {
    const restore = async () => {
      const stored = readToken();

      if (stored && !isExpired(stored)) {
        try {
          const res = await fetch(`${API}/api/users/me`, {
            headers:     { Authorization: `Bearer ${stored}` },
            credentials: 'include',
          });
          if (res.ok) {
            const { user: profile } = await res.json();
            applyAuth(stored, profile);
            setIsLoading(false);
            return;
          }
        } catch { /* fall through to refresh */ }
      }

      // Token missing or expired — try the httpOnly refresh cookie
      await attemptRefresh();
      setIsLoading(false);
    };

    restore();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sign Up ───────────────────────────────────────────────────────────────────
  const signUp = async (email: string, password: string, name?: string) => {
    const data = await post('/api/auth/signup', { email, password, name });
    applyAuth(data.accessToken, data.user);
  };

  // ── Sign In ───────────────────────────────────────────────────────────────────
  const signIn = async (email: string, password: string) => {
    const data = await post('/api/auth/signin', { email, password });
    applyAuth(data.accessToken, data.user);
  };

  // ── Register + Checkout (anonymous → real account) ───────────────────────────
  /**
   * Called at checkout when the user has no account.
   * Sends the cart items from sessionStorage to the server together with
   * the registration credentials. The server creates the account and saves
   * the cart in one atomic operation. The user is signed in immediately.
   */
  const registerAndCheckout = async (
    email:     string,
    password:  string,
    name:      string,
    cartItems: CartItemPayload[]
  ) => {
    const data = await post('/api/auth/register-checkout', {
      email, password, name, cartItems,
    });
    applyAuth(data.accessToken, data.user);
  };

  // ── Sign Out ──────────────────────────────────────────────────────────────────
  const signOut = async () => {
    const token = readToken();
    try {
      if (token) await post('/api/auth/signout', undefined, token);
    } catch { /* sign out locally even if server fails */ } finally {
      removeToken();
      // Clear the anonymous cart from sessionStorage so the next
      // user/session starts with an empty cart.
      sessionStorage.removeItem('skcare_local_cart');
      setUser(null);
      setAccessToken(null);
    }
  };

  const getToken = (): string | null => readToken();

  return (
    <AuthContext.Provider value={{
      user, accessToken, isLoading,
      signUp, signIn, signOut, getToken, registerAndCheckout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
