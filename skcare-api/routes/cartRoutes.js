// routes/cartRoutes.js
const router         = require('express').Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  getCart,
  addToCart,
  updateItemQuantity,
  updateShippingDetails,
  removeFromCart,
  clearCart,
  checkout,
} = require('../controller/cartController');
const {
  handleValidationErrors,
  addToCartRules,
  shippingDetailsRules,
  mongoIdParam,
} = require('../middleware/validate');

// All cart routes require authentication
router.use(authMiddleware);

// GET  /api/carts           — get current user's cart
router.get('/', getCart);

// POST /api/carts/items     — add items
router.post('/items', addToCartRules, handleValidationErrors, addToCart);

// PUT  /api/carts/items/:productId  — update quantity (0 = remove)
router.put(
  '/items/:productId',
  mongoIdParam('productId'),
  handleValidationErrors,
  updateItemQuantity
);

// DELETE /api/carts/items/:productId  — remove single item
router.delete(
  '/items/:productId',
  mongoIdParam('productId'),
  handleValidationErrors,
  removeFromCart
);

// DELETE /api/carts         — clear entire cart
router.delete('/', clearCart);

// PUT  /api/carts/shipping  — save shipping + payment details
router.put('/shipping', shippingDetailsRules, handleValidationErrors, updateShippingDetails);

// POST /api/carts/checkout  — place order from cart
router.post('/checkout', checkout);

module.exports = router;
