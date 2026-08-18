// admin/components/Customers.tsx
// Admin customer list — view registered users, search, view order count.
// Accessible to admin and superadmin only (enforced server-side).
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';

const API = import.meta.env.VITE_APP_API_BASE_URL || 'http://localhost:5000';

interface Customer {
  _id:        string;
  email:      string;
  name:       string;
  roles:      string[];
  topRole:    string;
  isVerified: boolean;
  createdAt:  string;
  lastLogin:  string | null;
}

const Customers = () => {
  const { getToken, user } = useAuth();
  const isSuperadmin = user?.topRole === 'superadmin';

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [page,      setPage]      = useState(1);
  const [hasMore,   setHasMore]   = useState(false);
  const [search,    setSearch]    = useState('');
  const [deleting,  setDeleting]  = useState<string | null>(null);

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization:  `Bearer ${getToken()}`,
  });

  const fetchCustomers = useCallback(async (p = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(p), limit: '20' });
      if (search) params.set('search', search);

      const res  = await fetch(`${API}/api/users?${params}`, { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch customers');
      if (p === 1) {
        setCustomers(data.data ?? []);
      } else {
        setCustomers((prev) => [...prev, ...(data.data ?? [])]);
      }
      setHasMore((data.pagination?.page ?? 1) < (data.pagination?.pages ?? 1));
      setPage(p);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load customers.');
    } finally {
      setLoading(false);
    }
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchCustomers(1); }, [fetchCustomers]);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Permanently delete ${name || 'this account'}?`)) return;
    setDeleting(id);
    try {
      const res  = await fetch(`${API}/api/users/${id}`, {
        method: 'DELETE', headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Delete failed');
      setCustomers((prev) => prev.filter((c) => c._id !== id));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleting(null);
    }
  };

  const roleBadge = (role: string) => {
    const map: Record<string, string> = {
      superadmin: 'bg-purple-100 text-purple-700 border-purple-200',
      admin:      'bg-blue-100   text-blue-700   border-blue-200',
      staff:      'bg-green-100  text-green-700  border-green-200',
      user:       'bg-gray-100   text-gray-600   border-gray-200',
    };
    return (
      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize
                        ${map[role] ?? map.user}`}>
        {role}
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-800">Customers</h2>
          <p className="text-xs text-gray-400 mt-0.5">{customers.length} loaded</p>
        </div>
        <div className="flex gap-2">
          <input
            type="search"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-3 py-2 w-56
                       focus:outline-none focus:border-[#4F705B]"
          />
          <button onClick={() => fetchCustomers(1)}
            className="text-xs px-3 py-2 bg-[#4F705B] text-white rounded-lg hover:bg-[#3a5344] transition">
            Search
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading && customers.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-[#4F705B] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">No customers found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Customer</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-left">Joined</th>
                  <th className="px-4 py-3 text-left">Last Login</th>
                  <th className="px-4 py-3 text-center">Verified</th>
                  {isSuperadmin && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customers.map((c) => (
                  <tr key={c._id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#4F705B] text-white flex items-center
                                        justify-center text-xs font-bold flex-shrink-0">
                          {(c.name?.[0] || c.email?.[0] || 'U').toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-800 truncate">
                            {c.name || '—'}
                          </p>
                          <p className="text-[10px] text-gray-400 truncate">{c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{roleBadge(c.topRole || c.roles[0])}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(c.createdAt).toLocaleDateString('en-NG', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {c.lastLogin
                        ? new Date(c.lastLogin).toLocaleDateString('en-NG', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })
                        : <span className="text-gray-300">Never</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-center">
                      {c.isVerified
                        ? <span className="text-green-500 text-base">✓</span>
                        : <span className="text-gray-300 text-base">✕</span>
                      }
                    </td>
                    {isSuperadmin && (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDelete(c._id, c.name)}
                          disabled={deleting === c._id}
                          className="text-xs text-red-400 hover:text-red-600
                                     disabled:opacity-40 transition font-medium"
                        >
                          {deleting === c._id ? 'Deleting…' : 'Delete'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {hasMore && (
        <div className="flex justify-center">
          <button onClick={() => fetchCustomers(page + 1)} disabled={loading}
            className="px-6 py-2.5 border border-gray-200 rounded-xl text-sm font-medium
                       text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition">
            {loading ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
};

export default Customers;
