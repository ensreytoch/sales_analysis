import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import LoginPage   from './pages/LoginPage';
import Dashboard   from './pages/Dashboard';
import UsersPage        from './pages/UsersPage';
import POSPage          from './pages/POSPage';
import TransactionsPage from './pages/TransactionsPage';
import InvoicesPage     from './pages/InvoicesPage';
import ProductsPage       from './pages/ProductsPage';
import ProductConfigsPage from './pages/ProductConfigsPage';
import RolesPage          from './pages/RolesPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/dashboard"
            element={
              <PrivateRoute permission="dashboard:read">
                <Dashboard />
              </PrivateRoute>
            }
          />

          <Route
            path="/pos"
            element={
              <PrivateRoute permission="sales:write">
                <POSPage />
              </PrivateRoute>
            }
          />

          <Route
            path="/transactions"
            element={
              <PrivateRoute permission="transactions:read">
                <TransactionsPage />
              </PrivateRoute>
            }
          />

          <Route
            path="/products"
            element={
              <PrivateRoute permission="products:read">
                <ProductsPage />
              </PrivateRoute>
            }
          />

          <Route
            path="/product-configs"
            element={
              <PrivateRoute permission="product-configs:read">
                <ProductConfigsPage />
              </PrivateRoute>
            }
          />

          <Route
            path="/invoices"
            element={
              <PrivateRoute permission="invoices:read">
                <InvoicesPage />
              </PrivateRoute>
            }
          />

          <Route
            path="/settings/roles"
            element={
              <PrivateRoute permission="roles:read">
                <RolesPage />
              </PrivateRoute>
            }
          />

          <Route
            path="/settings/users"
            element={
              <PrivateRoute permission="users:read">
                <UsersPage />
              </PrivateRoute>
            }
          />

          <Route
            path="/unauthorized"
            element={
              <div className="flex items-center justify-center h-screen text-gray-500">
                403 — You don't have permission to view this page.
              </div>
            }
          />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
