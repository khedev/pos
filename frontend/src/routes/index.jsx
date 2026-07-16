/**
 * Application route definitions.
 * SSR-compatible: exports a Routes component that works with
 * both BrowserRouter (client) and StaticRouter (server).
 *
 * Usage:
 *   <BrowserRouter><Routes /></BrowserRouter>  - Client
 *   <StaticRouter><Routes /></StaticRouter>     - Server
 */
import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import RoleGuard from '@/components/RoleGuard';
import { PageSkeleton } from '@/components/ui/Skeleton';

const LoginLayout = lazy(() => import('@/pages/Login/LoginLayout'));
const Login = lazy(() => import('@/pages/Login/Login'));
const ForgotPassword = lazy(() => import('@/pages/Login/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/Login/ResetPassword'));
const Dashboard = lazy(() => import('@/pages/Dashboard/Dashboard'));
const POS = lazy(() => import('@/pages/POS/POS'));
const Inventory = lazy(() => import('@/pages/Inventory/Inventory'));
const Receiving = lazy(() => import('@/pages/Receiving/Receiving'));
const Reports = lazy(() => import('@/pages/Reports/Reports'));
const Users = lazy(() => import('@/pages/Users/Users'));
const Settings = lazy(() => import('@/pages/Settings/Settings'));
const Categories = lazy(() => import('@/pages/Categories/Categories'));
const Suppliers = lazy(() => import('@/pages/Suppliers/Suppliers'));
const AuditLog = lazy(() => import('@/pages/AuditLog/AuditLog'));
const Notifications = lazy(() => import('@/pages/Notifications/Notifications'));
const ActivityDashboard = lazy(() => import('@/pages/ActivityDashboard/ActivityDashboard'));

const page = (element) => (
  <Suspense fallback={<PageSkeleton />}>
    {element}
  </Suspense>
);

/**
 * AppRoutes component.
 * Placed inside BrowserRouter (client) or StaticRouter (server).
 * All lazy-loaded pages use Suspense for both SSR and client navigation.
 */
export function AppRoutes() {
  return (
    <Routes>
      {/* Public login routes */}
      <Route path="/login" element={page(<LoginLayout />)}>
        <Route index element={page(<Login />)} />
        <Route path="forgot-password" element={page(<ForgotPassword />)} />
      </Route>
      <Route path="/forgot-password" element={page(<LoginLayout />)}>
        <Route index element={page(<ForgotPassword />)} />
      </Route>
      <Route path="/reset-password" element={page(<LoginLayout />)}>
        <Route index element={page(<ResetPassword />)} />
      </Route>

      {/* Protected dashboard routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={page(<Dashboard />)} />
        <Route path="pos" element={page(<POS />)} />
        <Route path="inventory" element={page(<Inventory />)} />
        <Route path="receiving" element={page(<Receiving />)} />
        <Route path="reports" element={page(<Reports />)} />
        <Route path="categories" element={page(<Categories />)} />
        <Route path="suppliers" element={page(<Suppliers />)} />
        <Route path="audit-log" element={page(<AuditLog />)} />
        <Route path="notifications" element={page(<Notifications />)} />
        <Route path="activity" element={page(<ActivityDashboard />)} />
        <Route
          path="users"
          element={page(
            <RoleGuard requiredPermission="users.manage">
              <Users />
            </RoleGuard>
          )}
        />
        <Route
          path="settings"
          element={page(
            <RoleGuard requiredPermission="settings.manage">
              <Settings />
            </RoleGuard>
          )}
        />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default AppRoutes;