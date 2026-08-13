// middleware/requireRole.js

/**
 * Role hierarchy (highest → lowest privilege):
 *   superadmin > admin > staff > user
 *
 * Usage:
 *   requireRole('superadmin')          — superadmin only
 *   requireRole('admin')               — admin OR superadmin
 *   requireRole('staff')               — staff, admin, OR superadmin
 *
 * Must be used AFTER authMiddleware so req.user is populated.
 */

const HIERARCHY = ['user', 'staff', 'admin', 'superadmin'];

/**
 * Returns the highest-privilege role the user holds.
 */
const getEffectiveLevel = (roles = []) => {
  let max = 0;
  for (const role of roles) {
    const idx = HIERARCHY.indexOf(role);
    if (idx > max) max = idx;
  }
  return max;
};

const requireRole = (minimumRole) => {
  const required = HIERARCHY.indexOf(minimumRole);
  if (required === -1) throw new Error(`Unknown role: ${minimumRole}`);

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const userLevel = getEffectiveLevel(req.user.roles);
    if (userLevel < required) {
      return res.status(403).json({
        error:   'Forbidden',
        message: `This action requires the '${minimumRole}' role or higher.`,
      });
    }

    next();
  };
};

/**
 * Convenience helpers — use these in routes for clarity.
 */
requireRole.superadmin = requireRole('superadmin');
requireRole.admin      = requireRole('admin');
requireRole.staff      = requireRole('staff');

/**
 * Helper: does a user have at least the given role level?
 * Useful inside controllers for conditional logic.
 */
requireRole.hasRole = (user, minimumRole) => {
  const required  = HIERARCHY.indexOf(minimumRole);
  const userLevel = getEffectiveLevel(user?.roles || []);
  return userLevel >= required;
};

module.exports = requireRole;
