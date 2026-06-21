import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PrivateRoute({ children, permission }) {
  const { user, loading, hasPermission } = useAuth();

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!user)   return <Navigate to="/login" replace />;
  if (permission && !hasPermission(permission)) return <Navigate to="/unauthorized" replace />;

  return children;
}
