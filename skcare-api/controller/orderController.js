// controller/orderController.js
const Order = require('../models/Order');

/**
 * GET /api/orders
 * Returns the authenticated user's order history, paginated.
 */
const getMyOrders = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find({ userId: req.user._id })
           .sort({ createdAt: -1 })
           .skip(skip)
           .limit(limit)
           .lean(),
      Order.countDocuments({ userId: req.user._id }),
    ]);

    return res.status(200).json({
      data: orders,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/orders/:id
 * Returns a single order. Users can only access their own; admins can access any.
 */
const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).lean();

    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    // Non-admins may only view their own orders
    const isAdmin = req.user.roles.includes('admin');
    if (!isAdmin && order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You do not have access to this order.' });
    }

    return res.status(200).json({ order });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/orders/admin/all
 * Admin only — all orders across all users with filtering & pagination.
 * Query params: page, limit, orderStatus, paymentStatus
 */
const getAllOrders = async (req, res, next) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(100, parseInt(req.query.limit) || 20);
    const skip   = (page - 1) * limit;

    const filter = {};
    if (req.query.orderStatus)   filter.orderStatus   = req.query.orderStatus;
    if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;

    const [orders, total] = await Promise.all([
      Order.find(filter)
           .populate('userId', 'email name')
           .sort({ createdAt: -1 })
           .skip(skip)
           .limit(limit)
           .lean(),
      Order.countDocuments(filter),
    ]);

    return res.status(200).json({
      data: orders,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/orders/:id/status
 * Admin only — update order status or payment status.
 * Body: { orderStatus?, paymentStatus?, paymentReference? }
 */
const updateOrderStatus = async (req, res, next) => {
  try {
    const { orderStatus, paymentStatus, paymentReference } = req.body;

    const validOrderStatuses   = ['processing', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    const validPaymentStatuses = ['pending', 'paid', 'failed', 'refunded'];

    if (orderStatus && !validOrderStatuses.includes(orderStatus)) {
      return res.status(400).json({
        message: `orderStatus must be one of: ${validOrderStatuses.join(', ')}`,
      });
    }

    if (paymentStatus && !validPaymentStatuses.includes(paymentStatus)) {
      return res.status(400).json({
        message: `paymentStatus must be one of: ${validPaymentStatuses.join(', ')}`,
      });
    }

    const updates = {};
    if (orderStatus)       updates.orderStatus       = orderStatus;
    if (paymentStatus)     updates.paymentStatus     = paymentStatus;
    if (paymentReference)  updates.paymentReference  = paymentReference;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No valid status fields provided.' });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    return res.status(200).json({ order });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/orders/:id/cancel
 * Users can cancel their own order only while it is still 'processing'.
 * Admins can cancel at any stage.
 */
const cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    const isAdmin   = req.user.roles.includes('admin');
    const isOwner   = order.userId.toString() === req.user._id.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: 'You do not have access to this order.' });
    }

    if (!isAdmin && order.orderStatus !== 'processing') {
      return res.status(400).json({
        message: `Orders can only be cancelled while in 'processing' status. Current status: ${order.orderStatus}.`,
      });
    }

    if (order.orderStatus === 'cancelled') {
      return res.status(400).json({ message: 'Order is already cancelled.' });
    }

    order.orderStatus = 'cancelled';
    await order.save();

    return res.status(200).json({ message: 'Order cancelled successfully.', order });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/orders/admin/stats
 * Admin only — single aggregation pipeline that returns dashboard stats
 * without fetching individual order documents.
 * O(1) query regardless of how many orders exist — uses MongoDB's native
 * $group and $facet operators which run entirely server-side.
 */
const getOrderStats = async (req, res, next) => {
  try {
    const [result] = await Order.aggregate([
      {
        $facet: {
          // Count and sum by paymentStatus
          byPayment: [
            {
              $group: {
                _id:      '$paymentStatus',
                count:    { $sum: 1 },
                revenue:  { $sum: '$totalAmount' },
              },
            },
          ],
          // Count by orderStatus
          byOrder: [
            {
              $group: {
                _id:   '$orderStatus',
                count: { $sum: 1 },
              },
            },
          ],
          // Total order count
          total: [{ $count: 'count' }],
        },
      },
    ]);

    // Build a convenient lookup from the aggregation results
    const paymentMap = {};
    (result.byPayment || []).forEach((r) => { paymentMap[r._id] = r; });

    const orderMap = {};
    (result.byOrder || []).forEach((r) => { orderMap[r._id] = r; });

    return res.status(200).json({
      totalOrders:    result.total[0]?.count                  ?? 0,
      paidOrders:     paymentMap.paid?.count                  ?? 0,
      pendingOrders:  paymentMap.pending?.count               ?? 0,
      failedOrders:   paymentMap.failed?.count                ?? 0,
      totalRevenue:   paymentMap.paid?.revenue                ?? 0,
      processing:     orderMap.processing?.count              ?? 0,
      confirmed:      orderMap.confirmed?.count               ?? 0,
      shipped:        orderMap.shipped?.count                 ?? 0,
      delivered:      orderMap.delivered?.count               ?? 0,
      cancelled:      orderMap.cancelled?.count               ?? 0,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMyOrders,
  getOrderById,
  getAllOrders,
  getOrderStats,
  updateOrderStatus,
  cancelOrder,
};
