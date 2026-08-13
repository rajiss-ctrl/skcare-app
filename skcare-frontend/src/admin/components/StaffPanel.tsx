// admin/components/StaffPanel.tsx
// Superadmin only — create staff accounts, manage roles, delete users
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';

const API = import.meta.env.VITE_APP_API_BASE_URL || 'http://localhost:5000';

type Role = 'user' | 'staff' | 'admin' | 'superadmin';

interface StaffUser {
  _id:       string;
  email:     string;
  name:      string;
  roles:     Role[];
  topRole:   Role;
  createdAt: string;
  lastLogin: string | null;
}

interface CreateForm {
  name:     string;
  email:    string;
  password: string;
  confirm:  string;
}

const ROLE_COLOURS: Record<Role, string> = {
  superadmin: 'bg-purple-100 text-purple-700 border border-purple-200',
  admin:      'bg-blue-100 text-blue-700 border border-blue-200',
  staff:      'bg-green-100 text-green-700 border border-green-200',
  user:       'bg-gray-100 text-gray-600 border border-gray-200',
};

const RoleBadge = ({ role }: { role: Role }) => (
  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${ROLE_COLOURS[role]}`}>
    {role}
  </span>
);

const StaffPanel = () => {
  const { getToken } = useAuth();

  const [users,       setUsers]       = useState<StaffUser[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [showCreate,  setShowCreate]  = useState(false);
  const [createForm,  setCreateForm]  = useState<CreateForm>({ name: '', email: '', password: '', confirm: '' });
  const [creating,    setCreating]    = useState(false);
  const [createErr,   setCreateErr]   = useState('');
  const [createOk,    setCreateOk]    = useState('');
  const [deletingId,  setDeletingId]  = useState<string | null>(null);
  const [updatingId,  setUpdatingId]  = useState<string | null>(null);

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization:  `Bearer ${getToken()}`,
  });

  // ── Fetch staff / admin / superadmin users ───────────────────────────────
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch staff + admin accounts (superadmin sees all via ?role filter omitted)
      const [staffRes, adminRes] = await Promise.all([
        fetch(`${API}/api/users?role=staff&limit=100`,  { headers: authHeaders() }),
        fetch(`${API}/api/users?role=admin&limit=100`,  { headers: authHeaders() }),
      ]);
      const staffData = await staffRes.json();
      const adminData = await adminRes.json();

      const combined = [
        ...(staffData.data  || []),
        ...(adminData.data  || []),
      ];

      // Deduplicate by _id (superadmin may appear in both queries)
      const seen = new Set<string>();
      const unique = combined.filter((u) => {
        if (seen.has(u._id)) return false;
        seen.add(u._id);
        return true;
      });

      setUsers(unique.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load staff.');
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // ── Create staff ─────────────────────────────────────────────────────────
  const handleCreate = async () => {
    setCreateErr('');
    setCreateOk('');

    const { name, email, password, confirm } = createForm;
    if (!name || !email || !password) {
      setCreateErr('All fields are required.');
      return;
    }
    if (password !== confirm) {
      setCreateErr('Passwords do not match.');
      return;
    }

    setCreating(true);
    try {
      const res  = await fetch(`${API}/api/users/staff`, {
        method:  'POST',
        headers: authHeaders(),
        body:    JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create staff.');

      setCreateOk(`Staff account created for ${data.user.email}`);
      setCreateForm({ name: '', email: '', password: '', confirm: '' });
      setShowCreate(false);
      fetchUsers();
    } catch (err: unknown) {
      setCreateErr(err instanceof Error ? err.message : 'Failed to create staff.');
    } finally {
      setCreating(false);
    }
  };

  // ── Update role ───────────────────────────────────────────────────────────
  const handleRoleChange = async (userId: string, newRole: Role) => {
    setUpdatingId(userId);
    try {
      const res  = await fetch(`${API}/api/users/${userId}/role`, {
        method:  'PUT',
        headers: authHeaders(),
        body:    JSON.stringify({ roles: [newRole] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update role.');
      setUsers((prev) => prev.map((u) => u._id === userId ? { ...u, roles: data.user.roles, topRole: data.user.topRole } : u));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Role update failed.');
    } finally {
      setUpdatingId(null);
    }
  };

  // ── Delete user ───────────────────────────────────────────────────────────
  const handleDelete = async (userId: string, userName: string) => {
    if (!window.confirm(`Delete ${userName}? This cannot be undone.`)) return;
    setDeletingId(userId);
    try {
      const res  = await fetch(`${API}/api/users/${userId}`, {
        method:  'DELETE',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Delete failed.');
      setUsers((prev) => prev.filter((u) => u._id !== userId));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Delete failed.');
    } finally {
      setDeletingId(null);
    }
  };

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#4F705B]';

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-800">Staff Management</h2>
          <p className="text-xs text-gray-400 mt-0.5">Create and manage staff and admin accounts</p>
        </div>
        <button
          onClick={() => { setShowCreate(!showCreate); setCreateErr(''); setCreateOk(''); }}
          className="px-4 py-2 bg-[#4F705B] text-white text-sm font-semibold rounded-lg hover:bg-[#3a5344] transition"
        >
          {showCreate ? 'Cancel' : '+ New Staff'}
        </button>
      </div>

      {/* Success message */}
      {createOk && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          ✅ {createOk}
        </div>
      )}

      {/* Create staff form */}
      {showCreate && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h3 className="text-sm font-bold text-gray-800 pb-3 border-b border-gray-100">
            Create Staff Account
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Full Name *</label>
              <input type="text" className={inputCls} placeholder="Jane Doe"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Email *</label>
              <input type="email" className={inputCls} placeholder="jane@skcare.com"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Password *</label>
              <input type="password" className={inputCls} placeholder="••••••••"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Confirm Password *</label>
              <input type="password" className={inputCls} placeholder="••••••••"
                value={createForm.confirm}
                onChange={(e) => setCreateForm({ ...createForm, confirm: e.target.value })} />
            </div>
          </div>

          <p className="text-xs text-gray-400">
            Min 8 chars · one uppercase · one number · one special character
          </p>
          <p className="text-xs text-gray-500">
            New staff can: upload products, update products, view orders and customers.<br />
            They cannot: delete products, manage users, or access staff panel.
          </p>

          {createErr && (
            <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{createErr}</p>
          )}

          <button
            onClick={handleCreate}
            disabled={creating}
            className="px-6 py-2.5 bg-[#4F705B] text-white text-sm font-semibold rounded-lg hover:bg-[#3a5344] disabled:opacity-50 transition"
          >
            {creating ? 'Creating…' : 'Create Staff Account'}
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Staff table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-800">
            Staff & Admins ({users.length})
          </h3>
          <button onClick={fetchUsers} className="text-xs text-[#4F705B] hover:underline">
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-[#4F705B] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            No staff accounts yet. Create one above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-5 py-3 text-left">Name</th>
                  <th className="px-5 py-3 text-left">Email</th>
                  <th className="px-5 py-3 text-left">Current Role</th>
                  <th className="px-5 py-3 text-left">Change Role</th>
                  <th className="px-5 py-3 text-left">Joined</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-3 font-medium text-gray-800">{u.name}</td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{u.email}</td>
                    <td className="px-5 py-3">
                      <RoleBadge role={u.topRole || u.roles[0] as Role} />
                    </td>
                    <td className="px-5 py-3">
                      <select
                        value={u.topRole || u.roles[0]}
                        disabled={!!updatingId}
                        onChange={(e) => handleRoleChange(u._id, e.target.value as Role)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#4F705B] bg-white disabled:opacity-50"
                      >
                        <option value="staff">Staff</option>
                        <option value="admin">Admin</option>
                        <option value="superadmin">Superadmin</option>
                      </select>
                      {updatingId === u._id && (
                        <span className="ml-2 text-xs text-gray-400">Saving…</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-400">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => handleDelete(u._id, u.name)}
                        disabled={!!deletingId}
                        className="text-xs text-red-400 hover:text-red-600 disabled:opacity-40 transition font-medium"
                      >
                        {deletingId === u._id ? 'Deleting…' : 'Remove'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Permission matrix */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-bold text-gray-800 mb-4 pb-3 border-b border-gray-100">
          Permission Matrix
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 font-semibold">
                <th className="text-left py-2 pr-4">Action</th>
                <th className="text-center px-3">Staff</th>
                <th className="text-center px-3">Admin</th>
                <th className="text-center px-3">Superadmin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[
                ['Upload products',         true,  true,  true ],
                ['Update products',         true,  true,  true ],
                ['Delete products',         false, false, true ],
                ['View orders',             true,  true,  true ],
                ['Update order status',     false, true,  true ],
                ['View customers',          false, true,  true ],
                ['Create staff accounts',   false, false, true ],
                ['Assign admin roles',      false, false, true ],
                ['Delete user accounts',    false, false, true ],
              ].map(([action, staff, admin, superadmin]) => (
                <tr key={action as string} className="hover:bg-gray-50">
                  <td className="py-2 pr-4 text-gray-700">{action as string}</td>
                  {[staff, admin, superadmin].map((allowed, i) => (
                    <td key={i} className="text-center px-3 py-2">
                      {allowed
                        ? <span className="text-green-500 text-base">✓</span>
                        : <span className="text-red-300 text-base">✕</span>
                      }
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StaffPanel;
