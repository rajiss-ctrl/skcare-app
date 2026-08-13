// middleware/requireAdmin.js

/**
 * Must be used AFTER authMiddleware.
 * Blocks the request unless the authenticated user has the 'admin' role.
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.roles.includes('admin')) {
    return res.status(403).json({
      error:   'Forbidden',
      message: 'You do not have permission to perform this action.',
    });
  }
  next();
};

module.exports = requireAdmin;
