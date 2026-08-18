// context/CartContext.tsx
/**
 * Cart Strategy:
 *
 * UNAUTHENTICATED user:
 *   Cart lives in sessionStorage only (key: 'skcare_local_cart').
 *   No network calls. Instant add/remove/update.
 *   Cleared when the browser tab is closed (sessionStorage is tab-scoped).
 *
 * AUTHENTICATED user:
 *   Cart lives in the database. All operations are API calls.
 *   On sign-in, any existing sessionStorage cart is merged into the DB cart
 *   by the checkout registration flow (registerAndCheckout).
 *
 * The context exposes a unified interface — components don't need to know
 * which backing store is in use.
 */
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { useAuth } from './AuthContext';

const API           = `${import.meta.env.VITE_APP_API_BASE_URL || 'http://localhost:5000'}/api/carts`;
const LOCAL_CART_KEY = 'skcare_local_cart';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CartItem {
  productId: string;
  name:      string;
  imageUrl:  string;
  price:     number;
  quantity:  number;
}

export interface ShippingDetails {
  name:            string;
  phone:           string;
  shippingAddress: {
    street:  string;
    city:    string;
    state:   string;
    zipCode: string;
    country: string;
  };
  paymentMethod: 'card' | 'bank_transfer' | 'paypal' | 'flutterwave';
}

export interface Cart {
  userId?:          string;
  userEmail?:       string;
  items:            CartItem[];
  shippingDetails?: Partial<ShippingDetails>;
}

interface CartContextType {
  cart:                  Cart | null;
  cartItemCount:         number;
  cartTotal:             number;
  isAnonymous:           boolean;      // true when backed by sessionStorage
  fetchCart:             () => Promise<void>;
  addToCart:             (item: CartItem) => Promise<void>;
  updateItemQuantity:    (productId: string, quantity: number) => Promise<void>;
  removeFromCart:        (productId: string) => Promise<void>;
  clearCart:             () => Promise<void>;
  updateShippingDetails: (details: ShippingDetails) => Promise<void>;
  checkout:              () => Promise<{ orderId: string }>;
  getLocalCartItems:     () => CartItem[];   // read sessionStorage cart for checkout transfer
}

// ─── Local cart helpers (sessionStorage) ─────────────────────────────────────

const readLocalCart = (): CartItem[] => {
  try {
    const raw = sessionStorage.getItem(LOCAL_CART_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
};

const writeLocalCart = (items: CartItem[]) => {
  sessionStorage.setItem(LOCAL_CART_KEY, JSON.stringify(items));
};

const clearLocalCart = () => sessionStorage.removeItem(LOCAL_CART_KEY);

const mergeItems = (existing: CartItem[], incoming: CartItem): CartItem[] => {
  const idx = existing.findIndex((i) => i.productId === incoming.productId);
  if (idx > -1) {
    return existing.map((i, n) =>
      n === idx ? { ...i, quantity: i.quantity + incoming.quantity } : i
    );
  }
  return [...existing, incoming];
};

// ─── Context ──────────────────────────────────────────────────────────────────

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { getToken, accessToken, user, isLoading: authLoading } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);

  // Derived: is the cart backed by sessionStorage or the DB?
  const isAnonymous = !user;

  // ── Authenticated fetch ─────────────────────────────────────────────────────
  const authFetch = useCallback(
    async (path: string, options: RequestInit = {}) => {
      const token = getToken();
      if (!token) throw new Error('Not authenticated');

      const res = await fetch(`${API}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${token}`,
          ...(options.headers || {}),
        },
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Cart request failed');
      return json;
    },
    [getToken]
  );

  // ── Fetch DB cart (authenticated users only) ────────────────────────────────
  const fetchCart = useCallback(async () => {
    if (!getToken()) return;
    try {
      const data = await authFetch('');
      setCart(data.cart ?? data);
    } catch (err) {
      console.error('fetchCart error:', err);
    }
  }, [authFetch, getToken]);

  // ── Add to cart ─────────────────────────────────────────────────────────────
  const addToCart = async (item: CartItem) => {
    if (isAnonymous) {
      // Unauthenticated — save to sessionStorage, no network call
      const updated = mergeItems(readLocalCart(), item);
      writeLocalCart(updated);
      setCart({ items: updated });
      return;
    }
    // Authenticated — save to DB
    const data = await authFetch('/items', {
      method: 'POST',
      body:   JSON.stringify({ items: [item] }),
    });
    setCart(data.cart ?? data);
  };

  // ── Update quantity ─────────────────────────────────────────────────────────
  const updateItemQuantity = async (productId: string, quantity: number) => {
    if (isAnonymous) {
      const items = readLocalCart();
      const updated = quantity === 0
        ? items.filter((i) => i.productId !== productId)
        : items.map((i) => i.productId === productId ? { ...i, quantity } : i);
      writeLocalCart(updated);
      setCart({ items: updated });
      return;
    }
    const data = await authFetch(`/items/${productId}`, {
      method: 'PUT',
      body:   JSON.stringify({ quantity }),
    });
    setCart(data.cart ?? data);
  };

  // ── Remove item ─────────────────────────────────────────────────────────────
  const removeFromCart = async (productId: string) => {
    if (isAnonymous) {
      const updated = readLocalCart().filter((i) => i.productId !== productId);
      writeLocalCart(updated);
      setCart({ items: updated });
      return;
    }
    const data = await authFetch(`/items/${productId}`, { method: 'DELETE' });
    setCart(data.cart ?? data);
  };

  // ── Clear cart ──────────────────────────────────────────────────────────────
  const clearCart = async () => {
    if (isAnonymous) {
      clearLocalCart();
      setCart({ items: [] });
      return;
    }
    const data = await authFetch('', { method: 'DELETE' });
    setCart(data.cart ?? data);
  };

  // ── Update shipping details (authenticated only — anonymous does it at checkout) ─
  const updateShippingDetails = async (shippingDetails: ShippingDetails) => {
    const data = await authFetch('/shipping', {
      method: 'PUT',
      body:   JSON.stringify({ shippingDetails }),
    });
    setCart(data.cart ?? data);
  };

  // ── Checkout ────────────────────────────────────────────────────────────────
  // Creates a pending order. Does NOT clear the cart — the cart is only
  // cleared after payment is confirmed successful (see handlePaymentCallback).
  const checkout = async (): Promise<{ orderId: string }> => {
    const data = await authFetch('/checkout', { method: 'POST' });
    return { orderId: data.orderId };
  };

  // ── Read local cart (for Checkout page to send to registerAndCheckout) ──────
  const getLocalCartItems = (): CartItem[] => readLocalCart();

  // ── Derived values ──────────────────────────────────────────────────────────
  const cartItemCount = cart?.items?.reduce((s, i) => s + i.quantity, 0) ?? 0;
  const cartTotal     = cart?.items?.reduce((s, i) => s + i.price * i.quantity, 0) ?? 0;

  // ── Sync cart when auth state changes ───────────────────────────────────────
  useEffect(() => {
    // Wait until auth restore is complete before touching the cart.
    // Prevents stale sessionStorage items appearing during the loading phase.
    if (authLoading) return;

    if (accessToken && user) {
      // Signed-in user — load their DB cart
      fetchCart();
    } else if (!user && !accessToken) {
      // Fully unauthenticated — load anonymous local cart from sessionStorage.
      // sessionStorage is tab-scoped so this is clean on every new tab.
      const items = readLocalCart();
      setCart(items.length > 0 ? { items } : null);
    }
  }, [authLoading, accessToken, user, fetchCart]);

  return (
    <CartContext.Provider value={{
      cart,
      cartItemCount,
      cartTotal,
      isAnonymous,
      fetchCart,
      addToCart,
      updateItemQuantity,
      removeFromCart,
      clearCart,
      updateShippingDetails,
      checkout,
      getLocalCartItems,
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
