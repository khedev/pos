import React, { Suspense, lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
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

const router = createBrowserRouter([
  {
    path: '/login',
    element: page(<LoginLayout />),
    children: [
      { index: true, element: page(<Login />) },
      { path: 'forgot-password', element: page(<ForgotPassword />) },
    ],
  },
  {
    path: '/forgot-password',
    element: page(<LoginLayout />),
    children: [
      { index: true, element: page(<ForgotPassword />) },
    ],
  },
  {
    path: '/reset-password',
    element: page(<LoginLayout />),
    children: [
      { index: true, element: page(<ResetPassword />) },
    ],
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: page(<Dashboard />) },
      { path: 'dashboard', element: page(<Dashboard />) },
      { path: 'pos', element: page(<POS />) },
      { path: 'inventory', element: page(<Inventory />) },
      { path: 'receiving', element: page(<Receiving />) },
      { path: 'reports', element: page(<Reports />) },
      { path: 'categories', element: page(<Categories />) },
      { path: 'suppliers', element: page(<Suppliers />) },
      { path: 'audit-log', element: page(<AuditLog />) },
      { path: 'notifications', element: page(<Notifications />) },
      { path: 'activity', element: page(<ActivityDashboard />) },
      {
        path: 'users',
        element: page(
          <RoleGuard requiredPermission="users.manage">
            <Users />
          </RoleGuard>
        ),
      },
      {
        path: 'settings',
        element: page(
          <RoleGuard requiredPermission="settings.manage">
            <Settings />
          </RoleGuard>
        ),
      },
    ],
  },
]);

export default router;
