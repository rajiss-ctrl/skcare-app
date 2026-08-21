// pages/Orders.tsx
// User-facing order history with real-time order progress tracker.
import React, { useState, useEffect, useCallback } from 'react';
import NavBar from '../components/NavBar';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const API = import.meta.env.VITE_APP_API_BASE_URL || 'http://localhost:5000';

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderStatus   = 'processing' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

interface OrderItem {
  productId: string;
  name:      string;
  imageUrl:  string;
  price:     number;
  quantity:  number;
}

interface Order {
  _id:             string;
  items:           OrderItem[];
  shippingAddress: {
    street:  string;
    city:    string;
    state:   string;
    zipCode: string;
    country: string;
  };
  subtotal:        number;
  totalAmount:     number;
  paymentStatus:   PaymentStatus;
  orderStatus:     OrderStatus;
  paymentMethod:   string;
  createdAt:       string;
  updatedAt:       string;
}

// ─── Progress steps ───────────────────────────────────────────────────────────

const PROGRESS_STEPS: { key: OrderStatus; label: string; icon: string; description: string }[] = [
  {
    key:         'processing',
    label:       'Order Placed',
    icon:        '🛍',
    description: 'We\'ve received your order.',
  },
  {
    key:         'confirmed',
    label:       'Confirmed',
    icon:        '✅',
    description: 'Payment verified. Your order is being prepared.',
  },
  {
    key:         'shipped',
    label:       'Shipped',
    icon:        '🚚',
    description: 'Your order is on its way.',
  },
  {
    key:         'delivered',
    label:       'Delivered',
    icon:        '🎉',
    description: 'Your order has been delivered.',
  },
];

// Index of each status in the progress flow
const STATUS_INDEX: Record<OrderStatus, number> = {
  processing: 0,
  confirmed:  1,
  shipped:    2,
  delivered:  3,
  cancelled:  -1,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const paymentBadge = (status: PaymentStatus) => {
  const map: Record<PaymentStatus, { label: string; cls: string }> = {
    pending:  { label: 'Awaiting Payment', cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    paid:     { label: 'Paid',             cls: 'bg-green-100  text-green-700  border-green-200'  },
    failed:   { label: 'Payment Failed',   cls: 'bg-red-100    text-red-700    border-red-200'    },
    refunded: { label: 'Refunded',         cls: 'bg-gray-100   text-gray-600   border-gray-200'   },
  };
  const { label, cls } = map[status] ?? map.pending;
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cls}`}>
      {label}
    </span>
  );
};

// ─── Order progress bar ───────────────────────────────────────────────────────

const OrderProgress: React.FC<{ status: OrderStatus; paymentStatus: PaymentStatus }> = ({
  status, paymentStatus,
}) => {
  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-2 py-3">
        <span className="text-xl">❌</span>
        <div>
          <p className="text-sm font-semibold text-red-600">Order Cancelled</p>
          <p className="text-xs text-gray-400">This order has been cancelled.</p>
        </div>
      </div>
    );
  }

  if (paymentStatus === 'failed') {
    return (
      <div className="flex items-center gap-2 py-3 p-3 bg-red-50 rounded-lg border border-red-100">
        <span className="text-xl">⚠️</span>
        <div>
          <p className="text-sm font-semibold text-red-600">Payment Failed</p>
          <p className="text-xs text-gray-500">
            Your cart items are still saved. Go back to cart to retry payment.
          </p>
        </div>
      </div>
    );
  }

  if (paymentStatus === 'pending') {
    return (
      <div className="flex items-center gap-2 py-3 p-3 bg-yellow-50 rounded-lg border border-yellow-100">
        <span className="text-xl">⏳</span>
        <div>
          <p className="text-sm font-semibold text-yellow-700">Awaiting Payment</p>
          <p className="text-xs text-gray-500">Complete your payment to process this order.</p>
        </div>
      </div>
    );
  }

  const currentIdx = STATUS_INDEX[status] ?? 0;

  return (
    <div className="py-2">
      {/* Step row */}
      <div className="flex items-start gap-0">
        {PROGRESS_STEPS.map((step, i) => {
          const isDone   = i < currentIdx;
          const isActive = i === currentIdx;
          const isFuture = i > currentIdx;
          return (
            <React.Fragment key={step.key}>
              {/* Step node */}
              <div className="flex flex-col items-center flex-shrink-0 w-16 sm:w-24">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-base
                                 border-2 transition-all ${
                  isDone   ? 'bg-[#4F705B] border-[#4F705B] text-white'  :
                  isActive ? 'bg-white border-[#4F705B] shadow-md scale-110' :
                             'bg-gray-100 border-gray-200 text-gray-400'
                }`}>
                  {isDone ? '✓' : <span className={isFuture ? 'opacity-40' : ''}>{step.icon}</span>}
                </div>
                <p className={`text-[10px] mt-1.5 font-medium text-center leading-tight ${
                  isDone || isActive ? 'text-[#4F705B]' : 'text-gray-400'
                }`}>
                  {step.label}
                </p>
              </div>

              {/* Connector line */}
              {i < PROGRESS_STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mt-4 transition-all ${
                  i < currentIdx ? 'bg-[#4F705B]' : 'bg-gray-200'
                }`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Active step description */}
      <p className="text-xs text-gray-500 mt-3 text-center">
        {PROGRESS_STEPS[currentIdx]?.description}
      </p>
    </div>
  );
};

// ─── Single order card ────────────────────────────────────────────────────────

const OrderCard: React.FC<{ order: Order; defaultOpen?: boolean }> = ({ order, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-4 flex items-center justify-between gap-4 hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Thumbnail stack */}
          <div className="flex -space-x-2 flex-shrink-0">
            {order.items.filter(Boolean).slice(0, 3).map((item, i) => (
              <img key={i} src={item.imageUrl || '/placeholder.jpg'} alt={item.name || 'Product'}
                className="w-9 h-9 rounded-lg object-cover border-2 border-white bg-gray-100"
                style={{ zIndex: 3 - i }}
              />
            ))}
            {order.items.length > 3 && (
              <div className="w-9 h-9 rounded-lg bg-gray-200 border-2 border-white
                              flex items-center justify-center text-[10px] font-bold text-gray-500">
                +{order.items.length - 3}
              </div>
            )}
          </div>
          <div className="min-w-0 text-left">
            <p className="text-xs font-semibold text-gray-800 truncate">
              Order #{order._id.slice(-8).toUpperCase()}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {new Date(order.createdAt).toLocaleDateString('en-NG', {
                day: 'numeric', month: 'short', year: 'numeric',
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {paymentBadge(order.paymentStatus)}
          <span className="font-bold text-sm text-gray-900">
            ₦{order.totalAmount.toLocaleString()}
          </span>
          <span className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
        </div>
      </button>

      {/* Expanded content */}
      {open && (
        <div className="border-t border-gray-100 px-5 py-5 space-y-5">

          {/* Progress */}
          <OrderProgress status={order.orderStatus} paymentStatus={order.paymentStatus} />

          {/* Items */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Items</p>
            <div className="space-y-2">
              {order.items.filter(Boolean).map((item) => (
                <div key={item.productId} className="flex items-center gap-3">
                  <img src={item.imageUrl || '/placeholder.jpg'} alt={item.name || 'Product'}
                    className="w-10 h-10 rounded-lg object-cover bg-gray-100 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">
                      {item.name || 'Deleted product'}
                    </p>
                    <p className="text-[10px] text-gray-400">Qty: {item.quantity}</p>
                  </div>
                  <p className="text-xs font-semibold text-gray-800 flex-shrink-0">
                    ₦{(item.price * item.quantity).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Shipping + totals */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                Delivery Address
              </p>
              <p className="text-xs text-gray-600 leading-relaxed">
                {order.shippingAddress.street},<br />
                {order.shippingAddress.city}, {order.shippingAddress.state}<br />
                {order.shippingAddress.zipCode}, {order.shippingAddress.country}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                Order Total
              </p>
              <div className="space-y-1 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₦{order.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery</span>
                  <span className="text-[#4F705B] font-semibold">Free</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-100">
                  <span>Total</span>
                  <span>₦{order.totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Retry payment link if pending/failed */}
          {(order.paymentStatus === 'pending' || order.paymentStatus === 'failed') && (
            <div className="pt-2 border-t border-gray-100">
              <Link to="/cartpreview"
                className="inline-flex items-center gap-1 text-sm font-semibold
                           text-[#4F705B] hover:underline">
                ← Return to cart to retry payment
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

const OrdersPage: React.FC = () => {
  const { getToken, user } = useAuth();
  const [orders,   setOrders]   = useState<Order[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [page,     setPage]     = useState(1);
  const [hasMore,  setHasMore]  = useState(false);

  const fetchOrders = useCallback(async (p = 1) => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/orders?page=${p}&limit=10`, {
        headers:     { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch orders');
      if (p === 1) {
        setOrders(data.data);
      } else {
        setOrders((prev) => [...prev, ...data.data]);
      }
      setHasMore(data.pagination.page < data.pagination.pages);
      setPage(p);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load orders.');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { fetchOrders(1); }, [fetchOrders]);

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="hidden md:block text-center py-2 bg-[#4F705B] text-white text-sm font-medium">
        Free deliveries on all orders within Nigeria
      </div>
      <NavBar />

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {user?.name ? `Welcome, ${user.name}` : 'Track and manage your orders'}
            </p>
          </div>
          <button onClick={() => fetchOrders(1)}
            className="text-xs text-[#4F705B] hover:underline font-medium">
            Refresh
          </button>
        </div>

        {loading && orders.length === 0 ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gray-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-1/3" />
                    <div className="h-2 bg-gray-200 rounded w-1/4" />
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-red-500 text-sm">{error}</p>
            <button onClick={() => fetchOrders(1)}
              className="mt-3 text-xs text-[#4F705B] hover:underline">
              Try again
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">📦</div>
            <h2 className="text-lg font-semibold text-gray-700">No orders yet</h2>
            <p className="text-sm text-gray-400 mt-1">When you place an order it will appear here.</p>
            <Link to="/"
              className="mt-5 inline-block px-6 py-2.5 bg-[#4F705B] text-white text-sm
                         font-semibold rounded-xl hover:bg-[#3a5344] transition">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order, idx) => (
              <OrderCard key={order._id} order={order} defaultOpen={idx === 0} />
            ))}

            {hasMore && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={() => fetchOrders(page + 1)}
                  disabled={loading}
                  className="px-6 py-2.5 border border-gray-200 rounded-xl text-sm
                             font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition"
                >
                  {loading ? 'Loading…' : 'Load more orders'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersPage;
