// routes/orderRoutes.js
const router         = require('express').Router();
const authMiddleware = require('../middleware/authMiddleware');
const requireAdmin   = require('../middleware/requireAdmin');
const {
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  cancelOrder,
} = require('../controller/orderController');
const { handleValidationErrors, mongoIdParam } = require('../middleware/validate');

// All order routes require authentication
router.use(authMiddleware);

// ── User-facing ───────────────────────────────────────────────────────────────

// GET  /api/orders           — own orders, paginated
router.get('/', getMyOrders);

// GET  /api/orders/:id       — single order (own or admin)
router.get(
  '/:id',
  mongoIdParam('id'),
  handleValidationErrors,
  getOrderById
);

// PATCH /api/orders/:id/cancel — cancel own order
router.patch(
  '/:id/cancel',
  mongoIdParam('id'),
  handleValidationErrors,
  cancelOrder
);

// ── Admin-only ────────────────────────────────────────────────────────────────

// GET  /api/orders/admin/all  — all orders with filters
router.get('/admin/all', requireAdmin, getAllOrders);

// PATCH /api/orders/:id/status — update order/payment status
router.patch(
  '/:id/status',
  requireAdmin,
  mongoIdParam('id'),
  handleValidationErrors,
  updateOrderStatus
);

module.exports = router;
