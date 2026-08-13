// admin/pages/Admin.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import UploadProduct   from '../components/UploadProduct';
import ProductsPanel   from '../components/Products';
import CustomersPanel  from '../components/Customers';
import OrdersPanel     from '../components/Order';
import StaffPanel      from '../components/StaffPanel';
import StatsCenter     from '../components/StaCenter';

// ─── Nav item definition ──────────────────────────────────────────────────────
interface NavItem {
  id:       string;
  label:    string;
  icon:     string;
  minRole:  'staff' | 'admin' | 'superadmin';
}

const NAV_ITEMS: NavItem[] = [
  { id: 'stats',    label: 'Dashboard',       icon: '📊', minRole: 'staff'      },
  { id: 'upload',   label: 'Add Product',      icon: '➕', minRole: 'staff'      },
  { id: 'products', label: 'Products',         icon: '📦', minRole: 'staff'      },
  { id: 'orders',   label: 'Orders',           icon: '🛍',  minRole: 'staff'      },
  { id: 'customers',label: 'Customers',        icon: '👥', minRole: 'admin'      },
  { id: 'staff',    label: 'Staff Management', icon: '🔐', minRole: 'superadmin' },
];

const HIERARCHY: Record<string, number> = {
  user: 0, staff: 1, admin: 2, superadmin: 3,
};

const hasRole = (userTopRole: string, minRole: string) =>
  (HIERARCHY[userTopRole] ?? 0) >= (HIERARCHY[minRole] ?? 999);

// ─── Role badge ───────────────────────────────────────────────────────────────
const RoleBadge = ({ role }: { role: string }) => {
  const colours: Record<string, string> = {
    superadmin: 'bg-purple-100 text-purple-700 border-purple-200',
    admin:      'bg-blue-100 text-blue-700 border-blue-200',
    staff:      'bg-green-100 text-green-700 border-green-200',
    user:       'bg-gray-100 text-gray-600 border-gray-200',
  };
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${colours[role] ?? colours.user}`}>
      {role}
    </span>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────
const Admin = () => {
  const { user, signOut } = useAuth();
  const navigate          = useNavigate();
  const [active,   setActive]   = useState('stats');
  const [sideOpen, setSideOpen] = useState(true);

  const topRole = user?.topRole ?? 'staff';

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const visibleNav = NAV_ITEMS.filter((item) => hasRole(topRole, item.minRole));

  const renderPanel = () => {
    switch (active) {
      case 'stats':     return <StatsCenter />;
      case 'upload':    return <UploadProduct />;
      case 'products':  return <ProductsPanel />;
      case 'orders':    return <OrdersPanel />;
      case 'customers': return <CustomersPanel />;
      case 'staff':     return <StaffPanel />;
      default:          return <StatsCenter />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <aside className={`flex flex-col bg-[#1a2e22] text-white transition-all duration-300 ${
        sideOpen ? 'w-60' : 'w-16'
      }`}>
        {/* Logo / toggle */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-white/10">
          {sideOpen && (
            <span className="text-sm font-bold tracking-wide text-[#a8d5b5]">SKCare Admin</span>
          )}
          <button
            onClick={() => setSideOpen(!sideOpen)}
            className="text-white/60 hover:text-white transition ml-auto"
            aria-label="Toggle sidebar"
          >
            {sideOpen ? '◀' : '▶'}
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-2">
          {visibleNav.map((item) => (
            <button
              key={item.id}
              onClick={() => setActive(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                active === item.id
                  ? 'bg-[#4F705B] text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="text-base flex-shrink-0">{item.icon}</span>
              {sideOpen && <span className="truncate">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* User info */}
        <div className="border-t border-white/10 p-4">
          {sideOpen ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#4F705B] flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {(user?.name?.[0] || user?.email?.[0] || 'A').toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{user?.name || 'Admin'}</p>
                  <p className="text-[10px] text-white/50 truncate">{user?.email}</p>
                </div>
              </div>
              <RoleBadge role={topRole} />
              <button
                onClick={handleSignOut}
                className="w-full text-xs text-white/60 hover:text-red-400 transition text-left py-1"
              >
                Sign Out →
              </button>
            </div>
          ) : (
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center text-white/60 hover:text-red-400 transition"
              aria-label="Sign out"
            >
              ✕
            </button>
          )}
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-lg font-bold text-gray-800 capitalize">
              {visibleNav.find((n) => n.id === active)?.icon}{' '}
              {visibleNav.find((n) => n.id === active)?.label ?? 'Dashboard'}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              SKCare Admin Panel
              {topRole === 'superadmin' && (
                <span className="ml-2 text-purple-600 font-semibold">· Full Access</span>
              )}
            </p>
          </div>
          <RoleBadge role={topRole} />
        </header>

        {/* Panel */}
        <main className="flex-1 overflow-y-auto p-6">
          {renderPanel()}
        </main>
      </div>
    </div>
  );
};

export default Admin;
