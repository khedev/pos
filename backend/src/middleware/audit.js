/**
 * Audit logging middleware for PGPOS
 * Logs actions to the audit_logs table
 */
import { supabase } from '../config/supabase.js';

/**
 * Log an audit action
 * @param {string} userId - The user performing the action
 * @param {string} action - The action being performed (e.g., 'CREATE', 'UPDATE', 'DELETE', 'LOGIN')
 * @param {string} entity - The entity type (e.g., 'products', 'users', 'sales')
 * @param {string} entityId - The ID of the entity
 * @param {object} details - Additional details about the action
 * @param {string} ipAddress - The IP address of the requester
 */
export const logAudit = async (userId, action, entity, entityId = null, details = null, ipAddress = null) => {
  try {
    const { error } = await supabase.from('audit_logs').insert({
      user_id: userId,
      action,
      entity,
      entity_id: entityId,
      details: details ? JSON.stringify(details) : null,
      ip_address: ipAddress,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Audit log error:', error.message);
    }
  } catch (error) {
    // Don't let audit logging failures affect the main operation
    console.error('Audit log exception:', error.message);
  }
};

/**
 * Middleware factory to create audit logging middleware for specific actions
 * @param {string} action - The action to log
 * @param {string} entity - The entity type
 * @param {function} getEntityId - Optional function to extract entity ID from req
 * @param {function} getDetails - Optional function to extract details from req
 */
export const auditMiddleware = (action, entity, getEntityId = null, getDetails = null) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    res.json = async function (body) {
      // Only log on success (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        const entityId = getEntityId ? getEntityId(req, body) : (req.params.id || body?.id || null);
        const details = getDetails ? getDetails(req, body) : (req.body || null);

        await logAudit(
          req.user.id,
          action,
          entity,
          entityId,
          details,
          req.ip
        );
      }

      return originalJson(body);
    };

    next();
  };
};

/**
 * Create audit log for CRUD operations automatically
 */
export const createAuditMiddleware = (entity) => ({
  create: auditMiddleware('CREATE', entity, (req, body) => body?.id, (req) => req.body),
  update: auditMiddleware('UPDATE', entity, (req) => req.params.id, (req) => req.body),
  delete: auditMiddleware('DELETE', entity, (req) => req.params.id),
});

export default logAudit;