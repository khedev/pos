/**
 * Permissions utility for PGPOS
 * Defines all permissions and role-based access control
 */

export const ALL_PERMISSIONS = [
  'dashboard.read',
  'pos.access',
  'sales.read',
  'sales.create',
  'sales.void',
  'inventory.read',
  'inventory.create',
  'inventory.update',
  'inventory.delete',
  'inventory.import',
  'inventory.export',
  'receiving.read',
  'receiving.create',
  'receiving.update',
  'receiving.delete',
  'reports.read',
  'reports.export',
  'users.read',
  'users.create',
  'users.update',
  'users.delete',
  'categories.read',
  'categories.create',
  'categories.update',
  'categories.delete',
  'suppliers.read',
  'suppliers.create',
  'suppliers.update',
  'suppliers.delete',
  'settings.read',
  'settings.update',
  'audit.read',
  'notifications.read',
  'notifications.manage',
  'activity.read',
  'backup.manage',
];

export const DEFAULT_ROLE_PERMISSIONS = {
  admin: ALL_PERMISSIONS,
  manager: [
    'dashboard.read',
    'pos.access',
    'sales.read',
    'sales.create',
    'inventory.read',
    'inventory.create',
    'inventory.update',
    'inventory.import',
    'inventory.export',
    'receiving.read',
    'receiving.create',
    'receiving.update',
    'reports.read',
    'reports.export',
    'categories.read',
    'categories.create',
    'categories.update',
    'categories.delete',
    'suppliers.read',
    'suppliers.create',
    'suppliers.update',
    'suppliers.delete',
    'settings.read',
    'notifications.read',
    'notifications.manage',
    'activity.read',
  ],
  cashier: [
    'dashboard.read',
    'pos.access',
    'sales.read',
    'sales.create',
    'inventory.read',
    'receiving.read',
    'categories.read',
    'suppliers.read',
    'notifications.read',
  ],
  csr: [
    'dashboard.read',
    'inventory.view',
    'receiving.read',
    'reports.view',
    'categories.read',
    'suppliers.read',
    'notifications.read',
  ],
};

/**
 * Get permissions for a given role
 * First tries to fetch from database, falls back to defaults
 */
export const getPermissionsForRole = async (supabase, role) => {
  try {
    // Try to get role-specific permissions from database
    const { data: roleData } = await supabase
      .from('roles')
      .select('id, name')
      .eq('name', role)
      .single();

    if (roleData) {
      const { data: permissions } = await supabase
        .from('permissions')
        .select('permission')
        .eq('role_id', roleData.id);

      if (permissions && permissions.length > 0) {
        return permissions.map(p => p.permission);
      }
    }
  } catch (error) {
    // Database lookup failed, use defaults
  }

  // Fall back to defaults
  return DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS.cashier;
};

/**
 * Check if a user has a specific permission
 */
export const hasPermission = (user, permission) => {
  if (!user || !user.permissions) return false;
  if (user.role === 'admin') return true;
  return user.permissions.includes(permission);
};

/**
 * Get default permissions for a role (no DB lookup)
 */
export const getDefaultPermissions = (role) => {
  return DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS.cashier;
};