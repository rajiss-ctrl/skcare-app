// routes/authRoutes.js
const router         = require('express').Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  signup,
  signin,
  guestSignin,
  convertGuest,
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
router.post('/guest',   guestSignin);

// POST /api/auth/convert  — guest → full account (requires valid guest token)
router.post('/convert', authMiddleware, convertGuestRules, handleValidationErrors, convertGuest);

// POST /api/auth/refresh  — reads cookie, no body validation needed
router.post('/refresh', refresh);

// POST /api/auth/signout  — removes the sent refresh token
router.post('/signout', authMiddleware, signout);

// POST /api/auth/signout-all  — invalidates all sessions
router.post('/signout-all', authMiddleware, signoutAll);

module.exports = router;
