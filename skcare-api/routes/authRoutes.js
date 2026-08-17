// routes/authRoutes.js
const router         = require('express').Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  signup,
  signin,
  registerAndCheckout,
  refresh,
  signout,
  signoutAll,
} = require('../controller/authController');
const {
  handleValidationErrors,
  signupRules,
  signinRules,
} = require('../middleware/validate');
const { body } = require('express-validator');

// ── Public ─────────────────────────────────────────────────────────────────────

// POST /api/auth/signup
router.post('/signup', signupRules, handleValidationErrors, signup);

// POST /api/auth/signin
router.post('/signin', signinRules, handleValidationErrors, signin);

// POST /api/auth/register-checkout
// For anonymous users — creates account + saves sessionStorage cart in one request.
// Public: no auth token needed (user has none yet).
router.post(
  '/register-checkout',
  [
    body('email')
      .isEmail().withMessage('A valid email is required.')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
      .matches(/[A-Z]/).withMessage('Password needs an uppercase letter.')
      .matches(/[0-9]/).withMessage('Password needs a number.')
      .matches(/[^A-Za-z0-9]/).withMessage('Password needs a special character.'),
    body('name')
      .trim()
      .notEmpty().withMessage('Full name is required.'),
    body('cartItems')
      .optional()
      .isArray().withMessage('cartItems must be an array.'),
    body('cartItems.*.productId')
      .optional()
      .isMongoId().withMessage('Each cart item must have a valid productId.'),
    body('cartItems.*.quantity')
      .optional()
      .isInt({ min: 1 }).withMessage('Each cart item quantity must be at least 1.'),
    body('cartItems.*.price')
      .optional()
      .isFloat({ min: 0 }).withMessage('Each cart item price must be non-negative.'),
  ],
  handleValidationErrors,
  registerAndCheckout
);

// POST /api/auth/refresh — reads httpOnly cookie
router.post('/refresh', refresh);

// ── Authenticated ──────────────────────────────────────────────────────────────

// POST /api/auth/signout
router.post('/signout', authMiddleware, signout);

// POST /api/auth/signout-all
router.post('/signout-all', authMiddleware, signoutAll);

module.exports = router;
