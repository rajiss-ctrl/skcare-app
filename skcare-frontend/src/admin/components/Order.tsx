// admin/components/Order.tsx
// Admin order management panel — view all orders, update status, filter by status.
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';

const API = import.meta.env.VITE_APP_API_BASE_URL || 'http://localhost:5000';

type OrderStatus   = 'processing' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

interface OrderItem {
  productId: string;
  name:      string;
  imageUrl:  string;
  price:     number;
  quantity:  number;
}

interface AdminOrder {
  _id:              string;
  userId:           { _id: string; email: string; name: string } | string;
  userEmail:        string;
  items:            OrderItem[];
  shippingAddress:  {
    street: string; city: string; state: string; zipCode: string; country: string;
  };
  subtotal:         number;
  totalAmount:      number;
  paymentStatus:    PaymentStatus;
  orderStatus:      OrderStatus;
  paymentReference: string;
  createdAt:        string;
}

// ─── Badge helpers ────────────────────────────────────────────────────────────

const orderStatusStyles: Record<OrderStatus, string> = {
  processing: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  confirmed:  'bg-blue-100   text-blue-700   border-blue-200',
  shipped:    'bg-purple-100 text-purple-700  border-purple-200',
  delivered:  'bg-green-100  text-green-700  border-green-200',
  cancelled:  'bg-red-100    text-red-600    border-red-200',
};

const paymentStatusStyles: Record<PaymentStatus, string> = {
  pending:  'bg-yellow-50 text-yellow-600 border-yellow-200',
  paid:     'bg-green-50  text-green-700  border-green-200',
  failed:   'bg-red-50    text-red-600    border-red-200',
  refunded: 'bg-gray-100  text-gray-600   border-gray-200',
};

const Badge = ({ label, cls }: { label: string; cls: string }) => (
  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${cls}`}>
    {label}
  </span>
);

// ─── Status selects ───────────────────────────────────────────────────────────

const ORDER_STATUSES:   OrderStatus[]   = ['processing', 'confirmed', 'shipped', 'delivered', 'cancelled'];
const PAYMENT_STATUSES: PaymentStatus[] = ['pending', 'paid', 'failed', 'refunded'];

// ─── Component ────────────────────────────────────────────────────────────────

const OrdersPanel = () => {
  const { getToken } = useAuth();

  const [orders,       setOrders]       = useState<AdminOrder[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [page,         setPage]         = useState(1);
  const [hasMore,      setHasMore]      = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPay,    setFilterPay]    = useState('');
  const [expandedId,   setExpandedId]   = useState<string | null>(null);
  const [updating,     setUpdating]     = useState<string | null>(null);

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization:  `Bearer ${getToken()}`,
  });

  const fetchOrders = useCallback(async (p = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(p), limit: '20' });
      if (filterStatus) params.set('orderStatus', filterStatus);
      if (filterPay)    params.set('paymentStatus', filterPay);

      const res  = await fetch(`${API}/api/orders/admin/all?${params}`, {
        headers: authHeaders(),
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
  }, [filterStatus, filterPay]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchOrders(1); }, [fetchOrders]);

  const updateStatus = async (
    orderId: string,
    field:   'orderStatus' | 'paymentStatus',
    value:   string
  ) => {
    setUpdating(orderId);
    try {
      const res  = await fetch(`${API}/api/orders/${orderId}/status`, {
        method:  'PATCH',
        headers: authHeaders(),
        body:    JSON.stringify({ [field]: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Update failed');
      setOrders((prev) =>
        prev.map((o) => o._id === orderId ? { ...o, ...data.order } : o)
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setUpdating(null);
    }
  };

  const userEmail = (order: AdminOrder) =>
    typeof order.userId === 'object' ? order.userId.email : order.userEmail;
  const userName  = (order: AdminOrder) =>
    typeof order.userId === 'object' ? order.userId.name : '';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-800">Orders</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {orders.length} order{orders.length !== 1 ? 's' : ''} loaded
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none
                       focus:border-[#4F705B] bg-white"
          >
            <option value="">All Order Status</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s} className="capitalize">{s}</option>
            ))}
          </select>

          <select
            value={filterPay}
            onChange={(e) => setFilterPay(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none
                       focus:border-[#4F705B] bg-white"
          >
            <option value="">All Payment Status</option>
            {PAYMENT_STATUSES.map((s) => (
              <option key={s} value={s} className="capitalize">{s}</option>
            ))}
          </select>

          <button onClick={() => fetchOrders(1)}
            className="text-xs px-3 py-2 bg-[#4F705B] text-white rounded-lg hover:bg-[#3a5344] transition">
            Refresh
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading && orders.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-[#4F705B] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">No orders found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Order ID</th>
                  <th className="px-4 py-3 text-left">Customer</th>
                  <th className="px-4 py-3 text-left">Items</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-left">Payment</th>
                  <th className="px-4 py-3 text-left">Order Status</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((order) => (
                  <>
                    <tr
                      key={order._id}
                      className="hover:bg-gray-50 transition cursor-pointer"
                      onClick={() => setExpandedId(expandedId === order._id ? null : order._id)}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">
                        #{order._id.slice(-8).toUpperCase()}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-medium text-gray-800">{userName(order) || '—'}</p>
                        <p className="text-[10px] text-gray-400">{userEmail(order)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex -space-x-1.5">
                          {order.items.slice(0, 3).map((item, i) => (
                            <img key={i} src={item.imageUrl} alt={item.name}
                              className="w-7 h-7 rounded-md object-cover border border-white bg-gray-100"
                              style={{ zIndex: 3 - i }}
                            />
                          ))}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-xs text-gray-800">
                        ₦{order.totalAmount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          label={order.paymentStatus}
                          cls={paymentStatusStyles[order.paymentStatus] || paymentStatusStyles.pending}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          label={order.orderStatus}
                          cls={orderStatusStyles[order.orderStatus] || orderStatusStyles.processing}
                        />
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {new Date(order.createdAt).toLocaleDateString('en-NG', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs text-[#4F705B] font-medium">
                          {expandedId === order._id ? 'Hide ▲' : 'Details ▼'}
                        </span>
                      </td>
                    </tr>

                    {/* Expanded row */}
                    {expandedId === order._id && (
                      <tr key={`${order._id}-expanded`}>
                        <td colSpan={8} className="px-6 py-5 bg-gray-50 border-t border-gray-100">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                            {/* Items */}
                            <div>
                              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                                Items
                              </p>
                              <div className="space-y-2">
                                {order.items.map((item) => (
                                  <div key={item.productId} className="flex items-center gap-2">
                                    <img src={item.imageUrl} alt={item.name}
                                      className="w-8 h-8 rounded object-cover bg-gray-200 flex-shrink-0" />
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs text-gray-700 truncate">{item.name}</p>
                                      <p className="text-[10px] text-gray-400">
                                        {item.quantity} × ₦{item.price.toLocaleString()}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Shipping */}
                            <div>
                              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                                Shipping Address
                              </p>
                              <p className="text-xs text-gray-600 leading-relaxed">
                                {order.shippingAddress.street},<br />
                                {order.shippingAddress.city}, {order.shippingAddress.state}<br />
                                {order.shippingAddress.zipCode}, {order.shippingAddress.country}
                              </p>
                              {order.paymentReference && (
                                <div className="mt-3">
                                  <p className="text-[10px] font-semibold text-gray-500 uppercase">
                                    Payment Ref
                                  </p>
                                  <p className="text-xs font-mono text-gray-600">{order.paymentReference}</p>
                                </div>
                              )}
                            </div>

                            {/* Status controls */}
                            <div className="space-y-3">
                              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                                Update Status
                              </p>

                              <div>
                                <label className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">
                                  Order Status
                                </label>
                                <select
                                  value={order.orderStatus}
                                  disabled={updating === order._id}
                                  onChange={(e) =>
                                    updateStatus(order._id, 'orderStatus', e.target.value)
                                  }
                                  className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2
                                             focus:outline-none focus:border-[#4F705B] bg-white
                                             disabled:opacity-50 capitalize"
                                >
                                  {ORDER_STATUSES.map((s) => (
                                    <option key={s} value={s} className="capitalize">{s}</option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">
                                  Payment Status
                                </label>
                                <select
                                  value={order.paymentStatus}
                                  disabled={updating === order._id}
                                  onChange={(e) =>
                                    updateStatus(order._id, 'paymentStatus', e.target.value)
                                  }
                                  className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2
                                             focus:outline-none focus:border-[#4F705B] bg-white
                                             disabled:opacity-50 capitalize"
                                >
                                  {PAYMENT_STATUSES.map((s) => (
                                    <option key={s} value={s} className="capitalize">{s}</option>
                                  ))}
                                </select>
                              </div>

                              {updating === order._id && (
                                <p className="text-xs text-gray-400 flex items-center gap-1">
                                  <span className="w-3 h-3 border border-[#4F705B] border-t-transparent
                                                   rounded-full animate-spin inline-block" />
                                  Saving…
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center">
          <button
            onClick={() => fetchOrders(page + 1)}
            disabled={loading}
            className="px-6 py-2.5 border border-gray-200 rounded-xl text-sm font-medium
                       text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition"
          >
            {loading ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
};

export default OrdersPanel;
