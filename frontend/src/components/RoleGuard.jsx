import React from 'react';
import { Outlet } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import useAuthStore from '@/store/authStore';
import { Card, CardContent } from '@/components/ui/Card';
import { canAccess } from '@/lib/permissions';

const RoleGuard = ({ allowedRoles = [], requiredPermission, children }) => {
  const { user } = useAuthStore();

  if (!user || !canAccess(user, { allowedRoles, requiredPermission })) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
              <ShieldAlert className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-sm text-gray-500">
              You do not have the required permissions to access this page.
              Please contact your administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return children || <Outlet />;
};

export default RoleGuard;
