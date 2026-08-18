// admin/components/StaCenter.tsx
// Dashboard statistics overview — total orders, revenue, customers, products.
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

const API = import.meta.env.VITE_APP_API_BASE_URL || 'http://localhost:5000';

interface Stats {
  totalOrders:    number;
  pendingOrders:  number;
  paidOrders:     number;
  totalRevenue:   number;
  totalCustomers: number;
  totalProducts:  number;
}

const StatCard = ({
  label, value, sub, icon, colour,
}: {
  label:   string;
  value:   string;
  sub?:    string;
  icon:    string;
  colour:  string;
}) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${colour}`}>
      {icon}
    </div>
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

const StaCenter = () => {
  const { getToken } = useAuth();
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      const token = getToken();
      if (!token) return;
      try {
        // Fetch orders summary and product count in parallel
        const [ordersRes, productsRes, usersRes] = await Promise.all([
          fetch(`${API}/api/orders/admin/all?limit=1000`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API}/api/products?limit=1&isActive=true`),
          fetch(`${API}/api/users?limit=1`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const ordersData   = await ordersRes.json();
        const productsData = await productsRes.json();
        const usersData    = await usersRes.json();

        const allOrders: { paymentStatus: string; totalAmount: number }[] =
          ordersData.data || [];

        setStats({
          totalOrders:    ordersData.pagination?.total ?? allOrders.length,
          pendingOrders:  allOrders.filter((o) => o.paymentStatus === 'pending').length,
          paidOrders:     allOrders.filter((o) => o.paymentStatus === 'paid').length,
          totalRevenue:   allOrders
            .filter((o) => o.paymentStatus === 'paid')
            .reduce((s, o) => s + o.totalAmount, 0),
          totalCustomers: usersData.pagination?.total ?? 0,
          totalProducts:  productsData.pagination?.total ?? 0,
        });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load stats.');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [getToken]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-gray-200" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-2.5 bg-gray-200 rounded w-1/2" />
                <div className="h-7 bg-gray-200 rounded w-3/4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
        {error}
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    {
      label:  'Total Revenue',
      value:  `₦${stats.totalRevenue.toLocaleString()}`,
      sub:    `from ${stats.paidOrders} paid order${stats.paidOrders !== 1 ? 's' : ''}`,
      icon:   '💰',
      colour: 'bg-green-100',
    },
    {
      label:  'Total Orders',
      value:  String(stats.totalOrders),
      sub:    `${stats.pendingOrders} awaiting payment`,
      icon:   '📦',
      colour: 'bg-blue-100',
    },
    {
      label:  'Paid Orders',
      value:  String(stats.paidOrders),
      sub:    'payments confirmed',
      icon:   '✅',
      colour: 'bg-emerald-100',
    },
    {
      label:  'Pending Payments',
      value:  String(stats.pendingOrders),
      sub:    'awaiting completion',
      icon:   '⏳',
      colour: 'bg-yellow-100',
    },
    {
      label:  'Customers',
      value:  String(stats.totalCustomers),
      sub:    'registered accounts',
      icon:   '👥',
      colour: 'bg-purple-100',
    },
    {
      label:  'Products',
      value:  String(stats.totalProducts),
      sub:    'active listings',
      icon:   '🛍',
      colour: 'bg-orange-100',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-bold text-gray-800">Dashboard Overview</h2>
        <p className="text-xs text-gray-400 mt-0.5">Live summary of your store</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {cards.map((c) => (
          <StatCard key={c.label} {...c} />
        ))}
      </div>
    </div>
  );
};

export default StaCenter;
