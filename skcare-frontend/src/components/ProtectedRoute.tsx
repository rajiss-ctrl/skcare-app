// components/ProtectedRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

type AllowedRole = 'staff' | 'admin' | 'superadmin';

interface ProtectedRouteProps {
  children:    React.ReactNode;
  /** Minimum role required. Hierarchy: superadmin > admin > staff > user */
  role?:       AllowedRole;
}

const HIERARCHY: Record<string, number> = {
  user:       0,
  staff:      1,
  admin:      2,
  superadmin: 3,
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, role }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-[#4F705B] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;

  if (role) {
    const userLevel     = HIERARCHY[user.topRole]  ?? 0;
    const requiredLevel = HIERARCHY[role] ?? 999;
    if (userLevel < requiredLevel) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
