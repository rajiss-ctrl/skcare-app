// context/CartContext.tsx
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { useAuth } from './AuthContext';

const API = `${import.meta.env.VITE_APP_API_BASE_URL || 'http://localhost:5000'}/api/carts`;

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
  userId:          string;
  userEmail:       string;
  items:           CartItem[];
  shippingDetails?: Partial<ShippingDetails>;
}

interface CartContextType {
  cart:                  Cart | null;
  cartItemCount:         number;
  cartTotal:             number;
  fetchCart:             () => Promise<void>;
  addToCart:             (item: CartItem) => Promise<void>;
  updateItemQuantity:    (productId: string, quantity: number) => Promise<void>;
  removeFromCart:        (productId: string) => Promise<void>;
  clearCart:             () => Promise<void>;
  updateShippingDetails: (details: ShippingDetails) => Promise<void>;
  checkout:              () => Promise<{ orderId: string }>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { getToken, accessToken } = useAuth();
  const [cart, setCart]    = useState<Cart | null>(null);

  /** Authenticated fetch helper */
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

  // ── Fetch cart ──────────────────────────────────────────────────────────────
  const fetchCart = useCallback(async () => {
    if (!getToken()) return;
    try {
      const data = await authFetch('');
      setCart(data.cart ?? data);
    } catch (err) {
      console.error('fetchCart error:', err);
    }
  }, [authFetch, getToken]);

  // ── Add items ───────────────────────────────────────────────────────────────
  const addToCart = async (item: CartItem) => {
    // Check token directly — not user state, which may lag behind after guestSignIn
    if (!getToken()) throw new Error('Please sign in to add items to cart');
    const data = await authFetch('/items', {
      method: 'POST',
      body:   JSON.stringify({ items: [item] }),
    });
    setCart(data.cart ?? data);
  };

  // ── Update quantity ─────────────────────────────────────────────────────────
  const updateItemQuantity = async (productId: string, quantity: number) => {
    const data = await authFetch(`/items/${productId}`, {
      method: 'PUT',
      body:   JSON.stringify({ quantity }),
    });
    setCart(data.cart ?? data);
  };

  // ── Remove item ─────────────────────────────────────────────────────────────
  const removeFromCart = async (productId: string) => {
    const data = await authFetch(`/items/${productId}`, { method: 'DELETE' });
    setCart(data.cart ?? data);
  };

  // ── Clear cart ──────────────────────────────────────────────────────────────
  const clearCart = async () => {
    const data = await authFetch('', { method: 'DELETE' });
    setCart(data.cart ?? data);
  };

  // ── Update shipping details ─────────────────────────────────────────────────
  const updateShippingDetails = async (shippingDetails: ShippingDetails) => {
    const data = await authFetch('/shipping', {
      method: 'PUT',
      body:   JSON.stringify({ shippingDetails }),
    });
    setCart(data.cart ?? data);
  };

  // ── Checkout ────────────────────────────────────────────────────────────────
  const checkout = async (): Promise<{ orderId: string }> => {
    const data = await authFetch('/checkout', { method: 'POST' });
    // Clear local cart state after successful checkout
    setCart((prev) => prev ? { ...prev, items: [] } : null);
    return { orderId: data.orderId };
  };

  // ── Derived values ──────────────────────────────────────────────────────────
  const cartItemCount = cart?.items?.reduce((sum, i) => sum + i.quantity, 0) ?? 0;
  const cartTotal     = cart?.items?.reduce((sum, i) => sum + i.price * i.quantity, 0) ?? 0;

  // ── Sync on auth state change ───────────────────────────────────────────────
  // Watch accessToken (not just user) so guest sign-in triggers a fetch immediately
  useEffect(() => {
    if (accessToken) {
      fetchCart();
    } else {
      setCart(null);
    }
  }, [accessToken, fetchCart]);

  return (
    <CartContext.Provider
      value={{
        cart,
        cartItemCount,
        cartTotal,
        fetchCart,
        addToCart,
        updateItemQuantity,
        removeFromCart,
        clearCart,
        updateShippingDetails,
        checkout,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
