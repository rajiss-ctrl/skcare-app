// routes/authRoutes.js
const router         = require('express').Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  signup,
  signin,
  guestSignin,
  registerFromGuest,
  convertGuest,
  clearGuestCart,
  refresh,
  signout,
  signoutAll,
} = require('../controller/authController');
const {
  handleValidationErrors,
  signupRules,
  signinRules,
  refreshRules,
  convertGuestRules,
} = require('../middleware/validate');

// POST /api/auth/signup
router.post('/signup',  signupRules,        handleValidationErrors, signup);

// POST /api/auth/signin
router.post('/signin',  signinRules,        handleValidationErrors, signin);

// POST /api/auth/guest  — no body required
router.post('/guest', guestSignin);

// POST /api/auth/register-from-guest — creates a NEW account, transfers cart, leaves guest intact
router.post('/register-from-guest', authMiddleware, convertGuestRules, handleValidationErrors, registerFromGuest);

// POST /api/auth/convert  — alias kept for backwards compatibility
router.post('/convert', authMiddleware, convertGuestRules, handleValidationErrors, registerFromGuest);

// POST /api/auth/refresh  — reads cookie, no body validation needed
router.post('/refresh', refresh);

// POST /api/auth/signout  — removes the sent refresh token
router.post('/signout', authMiddleware, signout);

// POST /api/auth/signout-all  — invalidates all sessions
router.post('/signout-all', authMiddleware, signoutAll);

// POST /api/auth/clear-guest-cart — clears cart for guest session (called on exit/expiry)
// Also accepts token in body for sendBeacon calls (which can't set headers)
router.post('/clear-guest-cart', (req, res, next) => {
  // sendBeacon sends token in body since it can't set Authorization header
  if (!req.headers['authorization'] && req.body?.token) {
    req.headers['authorization'] = `Bearer ${req.body.token}`;
  }
  next();
}, authMiddleware, clearGuestCart);

module.exports = router;
