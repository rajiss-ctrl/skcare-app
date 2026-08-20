// middleware/requireAdmin.js
// Kept for backwards compatibility — delegates to requireRole hierarchy.
// Passes for: admin, superadmin.
// Use requireRole.js directly in new routes for finer control.

const requireRole = require('./requireRole');

// requireRole('admin') already passes superadmin through the hierarchy
module.exports = requireRole('admin');
