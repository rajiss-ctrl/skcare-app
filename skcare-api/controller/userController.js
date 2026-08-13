// controller/userController.js
const User        = require('../models/Users');
const requireRole = require('../middleware/requireRole');
const bcrypt      = require('bcryptjs');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Roles that can only be assigned / removed by a superadmin */
const PRIVILEGED_ROLES = ['superadmin', 'admin'];

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * GET /api/users
 * staff+ — paginated user list.
 * Staff see only regular users; admin+ see staff too; superadmin sees everyone.
 */
const getUsers = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;

    // Build visibility filter based on caller's role
    let roleFilter;
    if (requireRole.hasRole(req.user, 'superadmin')) {
      roleFilter = {};                          // sees everyone
    } else if (requireRole.hasRole(req.user, 'admin')) {
      roleFilter = { roles: { $in: ['user', 'staff'] } }; // admin sees users + staff
    } else {
      roleFilter = { roles: { $in: ['user'] } };           // staff sees only users
    }

    const filter = { isGuest: false, ...roleFilter };
    if (req.query.search) {
      filter.$or = [
        { email: { $regex: req.query.search, $options: 'i' } },
        { name:  { $regex: req.query.search, $options: 'i' } },
      ];
    }
    if (req.query.role) filter.roles = req.query.role;

    const [users, total] = await Promise.all([
      User.find(filter)
          .select('-refreshTokens -guestToken -password')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
      User.countDocuments(filter),
    ]);

    return res.status(200).json({
      data:       users,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/users/me
 * Any authenticated user — returns own profile.
 */
const getMe = async (req, res, next) => {
  try {
    return res.status(200).json({ user: req.user.toPublicJSON() });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/users/:id
 * staff+ — fetch a single user.
 * Staff can only view regular users.
 */
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
                           .select('-refreshTokens -guestToken -password')
                           .lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Staff cannot view admins or superadmins
    if (
      !requireRole.hasRole(req.user, 'admin') &&
      (user.roles.includes('admin') || user.roles.includes('superadmin'))
    ) {
      return res.status(403).json({ message: 'You do not have permission to view this account.' });
    }

    return res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/users/me
 * Any authenticated user — update own name / photoURL.
 */
const updateMe = async (req, res, next) => {
  try {
    const allowed = ['name', 'photoURL'];
    const updates = {};
    allowed.forEach((f) => {
      if (req.body[f] !== undefined) {
        updates[f] = typeof req.body[f] === 'string' ? req.body[f].trim() : req.body[f];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No updatable fields provided.' });
    }

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    return res.status(200).json({ user: updated.toPublicJSON() });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/users/staff
 * superadmin only — create a staff account.
 * Staff accounts are pre-verified and immediately active.
 * Body: { email, password, name }
 */
const createStaff = async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ message: 'email, password, and name are required.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'An account with that email already exists.' });
    }

    const staff = await User.create({
      email:      email.toLowerCase().trim(),
      password,
      name:       name.trim(),
      roles:      ['staff'],
      isVerified: true,
    });

    return res.status(201).json({
      message: 'Staff account created successfully.',
      user:    staff.toPublicJSON(),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/users/:id/role
 * Superadmin — can assign any role including 'admin' and 'superadmin'.
 * Admin    — can only assign 'staff' or 'user' (cannot elevate to admin+).
 *
 * Body: { roles: ['staff'] }
 */
const updateUserRole = async (req, res, next) => {
  try {
    const { roles } = req.body;
    const ALL_ROLES = ['user', 'staff', 'admin', 'superadmin'];

    if (!Array.isArray(roles) || roles.length === 0) {
      return res.status(400).json({ message: 'roles must be a non-empty array.' });
    }
    if (roles.some((r) => !ALL_ROLES.includes(r))) {
      return res.status(400).json({
        message: `Valid roles: ${ALL_ROLES.join(', ')}`,
      });
    }

    // Only superadmin can assign privileged roles
    const requestingPrivileged = roles.some((r) => PRIVILEGED_ROLES.includes(r));
    if (requestingPrivileged && !requireRole.hasRole(req.user, 'superadmin')) {
      return res.status(403).json({
        message: 'Only a superadmin can assign admin or superadmin roles.',
      });
    }

    // Nobody can demote themselves
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot change your own role.' });
    }

    // Admins cannot reassign other admins or superadmins
    const target = await User.findById(req.params.id);
    if (!target) {
      return res.status(404).json({ message: 'User not found.' });
    }
    if (
      !requireRole.hasRole(req.user, 'superadmin') &&
      target.roles.some((r) => PRIVILEGED_ROLES.includes(r))
    ) {
      return res.status(403).json({ message: 'You cannot modify the role of an admin or superadmin.' });
    }

    target.roles = roles;
    await target.save();

    return res.status(200).json({
      message: 'Role updated successfully.',
      user:    target.toPublicJSON(),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/users/:id
 * superadmin only — permanently remove any non-superadmin account.
 * No one can delete a superadmin account via API.
 */
const removeUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot delete your own account.' });
    }

    const target = await User.findById(req.params.id);
    if (!target) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Protect superadmin accounts from deletion via API
    if (target.roles.includes('superadmin')) {
      return res.status(403).json({
        message: 'Superadmin accounts cannot be deleted via the API.',
      });
    }

    await target.deleteOne();
    return res.status(200).json({ message: 'User account deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getUsers,
  getMe,
  getUserById,
  updateMe,
  createStaff,
  updateUserRole,
  removeUser,
};
