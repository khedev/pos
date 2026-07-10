const DEFAULT_ROLE_PERMISSIONS = {
  admin: [
    'dashboard.view',
    'pos.process',
    'inventory.view',
    'inventory.manage',
    'receiving.create',
    'reports.view',
    'reports.export',
    'users.manage',
    'settings.manage',
    'sales.void',
  ],
  cashier: [
    'dashboard.view',
    'pos.process',
    'inventory.view',
    'receiving.create',
    'reports.view',
  ],
  csr: [
    'dashboard.view',
    'pos.process',
    'inventory.view',
    'receiving.create',
    'reports.view',
  ],
};

export const hasPermission = (user, permission) => {
  if (!permission) {
    return true;
  }

  // Admins have unrestricted access (matches backend semantics)
  if (user?.role === 'admin') {
    return true;
  }

  const permissions = Array.isArray(user?.permissions)
    ? user.permissions
    : DEFAULT_ROLE_PERMISSIONS[user?.role] || [];

  return permissions.includes(permission);
};

export const hasRole = (user, allowedRoles = []) => {
  if (!allowedRoles.length) {
    return true;
  }

  return allowedRoles.includes(user?.role);
};

export const canAccess = (user, { allowedRoles = [], requiredPermission } = {}) => {
  return hasRole(user, allowedRoles) && hasPermission(user, requiredPermission);
};
