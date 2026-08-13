// middleware/validate.js
const { validationResult, body, param } = require('express-validator');

/**
 * Runs after a chain of express-validator checks.
 * If any check failed, returns 400 with all error details.
 * Otherwise calls next().
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error:   'ValidationError',
      details: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

// ─── Auth validators ──────────────────────────────────────────────────────────

const signupRules = [
  body('email')
    .isEmail().withMessage('A valid email address is required.')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter.')
    .matches(/[0-9]/).withMessage('Password must contain at least one number.')
    .matches(/[^A-Za-z0-9]/).withMessage('Password must contain at least one special character.'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 80 }).withMessage('Name must be between 1 and 80 characters.'),
];

const signinRules = [
  body('email')
    .isEmail().withMessage('A valid email address is required.')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required.'),
];

const refreshRules = [
  body('refreshToken')
    .notEmpty().withMessage('refreshToken is required.'),
];

const convertGuestRules = [
  body('email')
    .isEmail().withMessage('A valid email address is required.')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter.')
    .matches(/[0-9]/).withMessage('Password must contain at least one number.')
    .matches(/[^A-Za-z0-9]/).withMessage('Password must contain at least one special character.'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 80 }),
];
// ─── Cart validators ──────────────────────────────────────────────────────────

const addToCartRules = [
  body('items')
    .isArray({ min: 1 }).withMessage('items must be a non-empty array.'),
  body('items.*.productId')
    .isMongoId().withMessage('Each item must have a valid productId.'),
  body('items.*.quantity')
    .isInt({ min: 1 }).withMessage('Each item quantity must be a positive integer.'),
  body('items.*.name')
    .notEmpty().withMessage('Each item must have a name.'),
  body('items.*.price')
    .isFloat({ min: 0 }).withMessage('Each item must have a valid price.'),
  body('items.*.imageUrl')
    .isURL().withMessage('Each item must have a valid imageUrl.'),
];

const shippingDetailsRules = [
  body('shippingDetails.name')
    .notEmpty().withMessage('Full name is required.'),
  body('shippingDetails.phone')
    .notEmpty().withMessage('Phone number is required.'),
  body('shippingDetails.shippingAddress.street')
    .notEmpty().withMessage('Street address is required.'),
  body('shippingDetails.shippingAddress.city')
    .notEmpty().withMessage('City is required.'),
  body('shippingDetails.shippingAddress.state')
    .notEmpty().withMessage('State is required.'),
  body('shippingDetails.shippingAddress.zipCode')
    .notEmpty().withMessage('Zip code is required.'),
  body('shippingDetails.shippingAddress.country')
    .notEmpty().withMessage('Country is required.'),
  body('shippingDetails.paymentMethod')
    .isIn(['card', 'bank_transfer', 'paypal', 'flutterwave'])
    .withMessage('Payment method must be one of: card, bank_transfer, paypal, flutterwave.'),
];

// ─── Product validators ───────────────────────────────────────────────────────

const addProductRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Product name is required.'),
  body('description')
    .trim()
    .notEmpty().withMessage('Product description is required.'),
  body('price')
    .isFloat({ min: 0 }).withMessage('Price must be a non-negative number.'),
  body('stock')
    .optional()
    .isInt({ min: 0 }).withMessage('Stock must be a non-negative integer.'),
  body('category')
    .optional()
    .trim(),
];

// ─── Order validators ─────────────────────────────────────────────────────────

const placeOrderRules = [
  body('shippingAddress.street').notEmpty().withMessage('Street address is required.'),
  body('shippingAddress.city').notEmpty().withMessage('City is required.'),
  body('shippingAddress.state').notEmpty().withMessage('State is required.'),
  body('shippingAddress.zipCode').notEmpty().withMessage('Zip code is required.'),
  body('shippingAddress.country').notEmpty().withMessage('Country is required.'),
  body('paymentMethod')
    .isIn(['card', 'bank_transfer', 'paypal', 'flutterwave'])
    .withMessage('Invalid payment method.'),
];

// ─── Param validators ─────────────────────────────────────────────────────────

const mongoIdParam = (paramName) => [
  param(paramName)
    .isMongoId().withMessage(`${paramName} must be a valid ID.`),
];

module.exports = {
  handleValidationErrors,
  signupRules,
  signinRules,
  refreshRules,
  convertGuestRules,
  addToCartRules,
  shippingDetailsRules,
  addProductRules,
  placeOrderRules,
  mongoIdParam,
};
