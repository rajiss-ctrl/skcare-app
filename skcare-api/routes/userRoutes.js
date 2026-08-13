// routes/userRoutes.js
const router         = require('express').Router();
const authMiddleware = require('../middleware/authMiddleware');
const requireRole    = require('../middleware/requireRole');
const {
  getUsers,
  getMe,
  getUserById,
  updateMe,
  createStaff,
  updateUserRole,
  removeUser,
} = require('../controller/userController');
const { handleValidationErrors, mongoIdParam } = require('../middleware/validate');
const { body } = require('express-validator');

// ── Own profile (any authenticated user) ─────────────────────────────────────

router.get('/me',  authMiddleware, getMe);
router.put('/me',  authMiddleware, updateMe);

// ── Staff management (superadmin only) ────────────────────────────────────────

/**
 * POST /api/users/staff
 * Create a staff account.
 * Only superadmin can do this.
 */
router.post(
  '/staff',
  authMiddleware,
  requireRole.superadmin,
  [
    body('email').isEmail().withMessage('Valid email required.').normalizeEmail(),
    body('password')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
      .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter.')
      .matches(/[0-9]/).withMessage('Password must contain a number.')
      .matches(/[^A-Za-z0-9]/).withMessage('Password must contain a special character.'),
    body('name').notEmpty().withMessage('Name is required.').trim(),
  ],
  handleValidationErrors,
  createStaff
);

// ── User listing (staff+) ─────────────────────────────────────────────────────

/**
 * GET /api/users
 * staff+ — list users. Visibility depends on caller role (see controller).
 * Supports: ?page=1&limit=20&search=email&role=user
 */
router.get('/', authMiddleware, requireRole.staff, getUsers);

// ── Single user (staff+) ──────────────────────────────────────────────────────

router.get(
  '/:id',
  authMiddleware,
  requireRole.staff,
  mongoIdParam('id'),
  handleValidationErrors,
  getUserById
);

// ── Role management (admin+, with superadmin restrictions enforced in controller) ─

/**
 * PUT /api/users/:id/role
 * admin — can assign 'staff' or 'user'.
 * superadmin — can assign any role.
 */
router.put(
  '/:id/role',
  authMiddleware,
  requireRole.admin,          // minimum: admin — superadmin restriction in controller
  mongoIdParam('id'),
  handleValidationErrors,
  [
    body('roles')
      .isArray({ min: 1 }).withMessage('roles must be a non-empty array.')
      .custom((arr) => {
        const valid = ['user', 'staff', 'admin', 'superadmin'];
        if (arr.some((r) => !valid.includes(r))) {
          throw new Error(`Each role must be one of: ${valid.join(', ')}`);
        }
        return true;
      }),
  ],
  handleValidationErrors,
  updateUserRole
);

// ── Delete user (superadmin only) ─────────────────────────────────────────────

/**
 * DELETE /api/users/:id
 * superadmin only — cannot delete other superadmins or self.
 */
router.delete(
  '/:id',
  authMiddleware,
  requireRole.superadmin,
  mongoIdParam('id'),
  handleValidationErrors,
  removeUser
);

module.exports = router;
