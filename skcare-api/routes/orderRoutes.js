// routes/orderRoutes.js
const router         = require('express').Router();
const authMiddleware = require('../middleware/authMiddleware');
const requireRole    = require('../middleware/requireRole');
const {
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  cancelOrder,
  getOrderStats,
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
router.get('/admin/all', requireRole.admin, getAllOrders);

// GET  /api/orders/admin/stats — aggregated stats for dashboard
router.get('/admin/stats', requireRole.admin, getOrderStats);

// PATCH /api/orders/:id/status — update order/payment status
router.patch(
  '/:id/status',
  requireRole.admin,
  mongoIdParam('id'),
  handleValidationErrors,
  updateOrderStatus
);

module.exports = router;
