import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const roleDashboardMap = {
  admin: '/admin-dashboard',
  teacher: '/teacher-dashboard',
  student: '/student-dashboard',
  parent: '/student-dashboard', // Parents share student view
};

/**
 * Route protection component.
 * Verifies authentication and role eligibility.
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isLoading } = useAuth();

  // Show a simple centered loading spinner while checking auth status
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-navy-900"></div>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Loading...</span>
        </div>
      </div>
    );
  }

  // Not logged in -> redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Logged in but not authorized for this specific role/route -> redirect to own dashboard
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const fallbackPath = roleDashboardMap[user.role] || '/login';
    return <Navigate to={fallbackPath} replace />;
  }

  return children;
};

export default ProtectedRoute;
