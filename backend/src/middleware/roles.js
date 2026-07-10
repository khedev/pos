import { hasPermission } from '../utils/permissions.js';

export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: 'Access denied. You do not have permission to perform this action.',
      });
    }

    next();
  };
};

export const authorizePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    if (!hasPermission(req.user, permission)) {
      return res.status(403).json({
        message: 'Access denied. You do not have permission to perform this action.',
      });
    }

    next();
  };
};

export const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      message: 'Access denied. Admin privileges required.',
    });
  }
  next();
};
