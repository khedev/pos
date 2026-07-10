import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Prevent background scroll while the mobile drawer is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.classList.add('no-scroll');
      return () => document.body.classList.remove('no-scroll');
    }
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        isMobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />
      <div className="lg:pl-60">
        <Navbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <main className="p-3 sm:p-4 lg:p-6 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
