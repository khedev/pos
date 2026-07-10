import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Package, Truck, BarChart3,
  Users, Settings, ChevronLeft, ChevronRight, LogOut, X,
  FolderTree, Building2, ScrollText, Bell, Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import useAuthStore from '@/store/authStore';

const getInitials = (name) => {
  if (!name) return 'U';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

const navigationGroups = [
  {
    label: 'Main',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'manager', 'cashier', 'csr'] },
      { path: '/pos', label: 'POS', icon: ShoppingCart, roles: ['admin', 'manager', 'cashier', 'csr'] },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { path: '/inventory', label: 'Inventory', icon: Package, roles: ['admin', 'manager', 'cashier', 'csr'] },
      { path: '/receiving', label: 'Receiving', icon: Truck, roles: ['admin', 'manager'] },
      { path: '/categories', label: 'Categories', icon: FolderTree, roles: ['admin', 'manager'] },
      { path: '/suppliers', label: 'Suppliers', icon: Building2, roles: ['admin', 'manager'] },
    ],
  },
  {
    label: 'Reports',
    items: [
      { path: '/reports', label: 'Reports', icon: BarChart3, roles: ['admin', 'manager'] },
      { path: '/audit-log', label: 'Audit Log', icon: ScrollText, roles: ['admin'] },
    ],
  },
  {
    label: 'System',
    items: [
      { path: '/users', label: 'Users', icon: Users, roles: ['admin'] },
      { path: '/settings', label: 'Settings', icon: Settings, roles: ['admin', 'manager'] },
      { path: '/notifications', label: 'Notifications', icon: Bell, roles: ['admin', 'manager', 'cashier', 'csr'] },
      { path: '/activity', label: 'Activity', icon: Activity, roles: ['admin'] },
    ],
  },
];

const Sidebar = ({ isMobileOpen, onMobileClose }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (isMobileOpen && onMobileClose) {
      onMobileClose();
    }
  }, [location.pathname]);

  const userRole = user?.role || 'cashier';

  return (
    <>
      {isMobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onMobileClose} />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-screen bg-white border-r border-gray-200 transition-all duration-300 flex flex-col',
          'pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]',
          collapsed ? 'w-16' : 'w-60 max-w-[80vw]',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          {!collapsed ? (
            <h1 className="text-lg font-bold text-primary">PGPOS</h1>
          ) : (
            <h1 className="text-lg font-bold text-primary mx-auto">P</h1>
          )}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex items-center justify-center w-8 h-8 rounded-md hover:bg-gray-100 text-gray-500"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
            {!collapsed && (
              <button
                onClick={onMobileClose}
                className="lg:hidden flex items-center justify-center w-8 h-8 rounded-md hover:bg-gray-100 text-gray-500"
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-4">
          {navigationGroups.map((group) => {
            const filteredItems = group.items.filter(item => item.roles.includes(userRole));
            if (filteredItems.length === 0) return null;

            return (
              <div key={group.label}>
                {!collapsed && (
                  <p className="px-3 mb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {group.label}
                  </p>
                )}
                <div className="space-y-1">
                  {filteredItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path || 
                      (item.path !== '/' && location.pathname.startsWith(item.path));
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        )}
                        title={collapsed ? item.label : ''}
                      >
                        <Icon className="h-5 w-5 flex-shrink-0" />
                        {!collapsed && <span>{item.label}</span>}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User info */}
        <div className="border-t border-gray-200 p-4">
          <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold flex-shrink-0">
              {getInitials(user?.name || user?.email)}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.name || user?.email}
                </p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={logout}
              className="mt-3 flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;