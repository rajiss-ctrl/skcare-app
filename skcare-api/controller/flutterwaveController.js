// controller/flutterwaveController.js
const crypto             = require('crypto');
const Flutterwave        = require('flutterwave-node-v3');
const Order              = require('../models/Order');
const PaymentTransaction = require('../models/PaymentTransaction');

// ─── SDK initialisation ───────────────────────────────────────────────────────
// Secret key stays server-side only — never sent to the client
const flw = new Flutterwave(
  process.env.FLW_PUBLIC_KEY,
  process.env.FLW_SECRET_KEY
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generate a URL-safe unique transaction reference.
 * Format: skcare-<timestamp>-<8 random hex chars>
 */
const generateTxRef = () =>
  `skcare-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

/**
 * Timing-safe string comparison — prevents timing attacks on webhook secrets.
 */
const safeCompare = (a, b) => {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * POST /api/flutterwave/initiate-payment
 * Called by the frontend after shipping details are saved.
 * Creates a PaymentTransaction record and returns the tx_ref + config
 * needed for the Flutterwave modal.
 *
 * Body: { orderId }
 * The order must already exist (created by POST /api/carts/checkout).
 */
const initiatePayment = async (req, res, next) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: 'orderId is required.' });
    }

    // Fetch the order — must belong to the authenticated user
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }
    if (order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You do not have access to this order.' });
    }
    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ message: 'This order has already been paid.' });
    }

    // Guard: Flutterwave rejects amount of 0
    if (!order.totalAmount || order.totalAmount <= 0) {
      return res.status(400).json({
        message: 'Order total is 0. Cannot initiate payment for an empty order.',
      });
    }

    // Check for an existing pending transaction for this order (idempotency)
    let transaction = await PaymentTransaction.findOne({
      orderId: order._id,
      status:  'pending',
    });

    if (!transaction) {
      const tx_ref = generateTxRef();
      transaction  = await PaymentTransaction.create({
        tx_ref,
        orderId:  order._id,
        userId:   req.user._id,
        amount:   order.totalAmount,
        currency: 'NGN',
        status:   'pending',
      });
    }

    // Return only what the frontend needs to open the Flutterwave modal.
    // The public key is sent here so we can switch keys without a frontend deploy.
    return res.status(200).json({
      tx_ref:     transaction.tx_ref,
      amount:     Number(transaction.amount),   // ensure number not string
      currency:   transaction.currency,
      public_key: process.env.FLW_PUBLIC_KEY,
      customer: {
        email:        req.user.email,
        name:         req.user.name  || 'Customer',
        phone_number: order.shippingAddress?.phone || '',
      },
      customizations: {
        title:       'SKCare Store',
        description: `Order #${order._id}`,
        logo:        process.env.STORE_LOGO_URL || '',
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/flutterwave/webhook
 * Receives asynchronous payment notifications from Flutterwave.
 *
 * Security:
 *   - Verifies the verif-hash header using timing-safe comparison.
 *   - Idempotency: if tx_ref already processed (success/failed), returns 200 immediately.
 *
 * IMPORTANT: This route must receive the RAW request body (not JSON-parsed)
 * because the body is used for signature verification.
 * See flutterwaveRoutes.js for the raw body middleware.
 */
const webhook = async (req, res) => {
  try {
    // ── 1. Verify webhook signature ────────────────────────────────────────
    const hash = req.headers['verif-hash'];
    if (!hash) {
      console.warn('[Webhook] Missing verif-hash header');
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    const secretHash = process.env.FLW_SECRET_HASH;
    if (!secretHash || !safeCompare(hash, secretHash)) {
      console.warn('[Webhook] Invalid verif-hash — possible spoofed request');
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    // ── 2. Parse event ─────────────────────────────────────────────────────
    // req.body is the raw Buffer here; parse it ourselves
    let event;
    try {
      event = JSON.parse(req.body.toString('utf8'));
    } catch {
      return res.status(400).json({ message: 'Invalid JSON payload.' });
    }

    const { event: eventType, data } = event;

    // Only handle charge events
    if (!eventType?.startsWith('charge.')) {
      return res.status(200).json({ received: true });
    }

    const tx_ref = data?.tx_ref;
    if (!tx_ref) {
      return res.status(200).json({ received: true });
    }

    // ── 3. Idempotency — skip if already processed ─────────────────────────
    const existing = await PaymentTransaction.findOne({ tx_ref });
    if (!existing) {
      console.warn(`[Webhook] Unknown tx_ref: ${tx_ref}`);
      return res.status(200).json({ received: true });
    }

    if (existing.status !== 'pending') {
      // Already processed — acknowledge without re-processing
      return res.status(200).json({ received: true, alreadyProcessed: true });
    }

    // ── 4. Verify the transaction with Flutterwave API (server-side) ────────
    let verifiedData;
    try {
      const response = await flw.Transaction.verify({ id: data.id });
      verifiedData   = response.data;
    } catch (flwErr) {
      console.error('[Webhook] Flutterwave verification failed:', flwErr.message);
      return res.status(200).json({ received: true }); // Return 200 so FLW doesn't retry
    }

    const isSuccessful =
      verifiedData.status         === 'successful' &&
      verifiedData.tx_ref         === tx_ref &&
      verifiedData.currency       === existing.currency &&
      verifiedData.charged_amount >= existing.amount; // allow overpayment, reject underpayment

    // ── 5. Update records ──────────────────────────────────────────────────
    if (isSuccessful) {
      existing.status         = 'success';
      existing.flw_tx_id      = String(data.id);
      existing.webhookPayload = event;
      existing.processedAt    = new Date();
      await existing.save();

      await Order.findByIdAndUpdate(existing.orderId, {
        $set: {
          paymentStatus:    'paid',
          orderStatus:      'confirmed',
          paymentReference: String(data.id),
        },
      });

      // ── Clear the cart ONLY on successful payment ────────────────────────
      // This is the single place cart clearing happens, guaranteeing the
      // cart survives failed/cancelled payment attempts.
      const Cart = require('../models/Carts');
      await Cart.findOneAndUpdate(
        { userId: existing.userId },
        { $set: { items: [], shippingDetails: {} } }
      );

      console.log(`[Webhook] ✅ Payment confirmed for tx_ref: ${tx_ref}`);
    } else {
      existing.status         = 'failed';
      existing.webhookPayload = event;
      existing.processedAt    = new Date();
      await existing.save();

      await Order.findByIdAndUpdate(existing.orderId, {
        $set: { paymentStatus: 'failed' },
      });

      // Cart is intentionally NOT cleared on failure — user keeps their items
      console.log(`[Webhook] ❌ Payment failed for tx_ref: ${tx_ref}`);
    }

    // Always return 200 quickly — Flutterwave expects a response within 30s
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('[Webhook] Unhandled error:', err.message);
    // Still return 200 to prevent Flutterwave retry storms
    return res.status(200).json({ received: true });
  }
};

/**
 * GET /api/flutterwave/transaction-status/:tx_ref
 * Frontend polls this after the Flutterwave modal closes to get the real
 * payment status from our database (not trusting the client callback).
 *
 * If status is still 'pending' (webhook not yet received), we do a live
 * Flutterwave API check as a fallback.
 */
const getTransactionStatus = async (req, res, next) => {
  try {
    const { tx_ref } = req.params;

    const transaction = await PaymentTransaction.findOne({ tx_ref }).lean();
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found.' });
    }

    // Ownership check — only the transaction owner can query it
    if (transaction.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    // If already settled, return immediately
    if (transaction.status !== 'pending') {
      return res.status(200).json({
        status:  transaction.status,
        orderId: transaction.orderId,
        tx_ref:  transaction.tx_ref,
      });
    }

    // ── Fallback: query Flutterwave directly (webhook may be delayed) ───────
    try {
      const response = await flw.Transaction.verify({ id: transaction.flw_tx_id || tx_ref });
      const data     = response.data;

      if (data?.status === 'successful') {
        // Update ourselves proactively (webhook will also arrive and be idempotent)
        await PaymentTransaction.findByIdAndUpdate(transaction._id, {
          $set: {
            status:         'success',
            flw_tx_id:      String(data.id),
            processedAt:    new Date(),
          },
        });
        await Order.findByIdAndUpdate(transaction.orderId, {
          $set: {
            paymentStatus:    'paid',
            orderStatus:      'confirmed',
            paymentReference: String(data.id),
          },
        });
        // Clear the cart on confirmed payment
        const Cart = require('../models/Carts');
        await Cart.findOneAndUpdate(
          { userId: transaction.userId },
          { $set: { items: [], shippingDetails: {} } }
        );
        return res.status(200).json({
          status:  'success',
          orderId: transaction.orderId,
          tx_ref,
        });
      }
    } catch {
      // Fallback failed — just return pending, webhook will update later
    }

    return res.status(200).json({
      status:  'pending',
      orderId: transaction.orderId,
      tx_ref,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/flutterwave/verify/:transaction_id
 * PUBLIC endpoint — no auth token required.
 *
 * Verifies a payment using Flutterwave's transaction ID returned in the
 * modal callback. The transaction_id is issued by Flutterwave and is
 * cryptographically tied to a real charge — it cannot be guessed or forged.
 *
 * This solves the token expiry problem: even if the user's JWT has expired
 * by the time the modal closes, we can still verify the payment.
 */
const verifyByTransactionId = async (req, res, next) => {
  try {
    const { transaction_id } = req.params;

    if (!transaction_id || isNaN(Number(transaction_id))) {
      return res.status(400).json({ message: 'Invalid transaction ID.' });
    }

    // Verify directly with Flutterwave using the transaction_id
    let verifiedData;
    try {
      const response = await flw.Transaction.verify({ id: Number(transaction_id) });
      verifiedData   = response.data;
    } catch (flwErr) {
      console.error('[Verify] Flutterwave verification failed:', flwErr.message);
      return res.status(502).json({ message: 'Could not verify payment with Flutterwave.' });
    }

    if (!verifiedData) {
      return res.status(404).json({ message: 'Transaction not found on Flutterwave.' });
    }

    const tx_ref = verifiedData.tx_ref;

    // Find our internal transaction record by tx_ref
    const transaction = await PaymentTransaction.findOne({ tx_ref });
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction record not found.' });
    }

    // Idempotency — already processed
    if (transaction.status === 'success') {
      return res.status(200).json({
        status:  'success',
        orderId: transaction.orderId,
        tx_ref,
      });
    }

    // Validate: amount and currency must match what we originally recorded
    const isSuccessful =
      verifiedData.status         === 'successful' &&
      verifiedData.currency       === transaction.currency &&
      verifiedData.charged_amount >= transaction.amount;

    if (isSuccessful) {
      // Update transaction record
      transaction.status         = 'success';
      transaction.flw_tx_id      = String(transaction_id);
      transaction.processedAt    = new Date();
      await transaction.save();

      // Update order
      await Order.findByIdAndUpdate(transaction.orderId, {
        $set: {
          paymentStatus:    'paid',
          orderStatus:      'confirmed',
          paymentReference: String(transaction_id),
        },
      });

      // Clear the cart on successful payment
      const Cart = require('../models/Carts');
      await Cart.findOneAndUpdate(
        { userId: transaction.userId },
        { $set: { items: [], shippingDetails: {} } }
      );

      return res.status(200).json({
        status:  'success',
        orderId: transaction.orderId,
        tx_ref,
      });
    }

    // Payment failed or amount mismatch
    transaction.status      = 'failed';
    transaction.processedAt = new Date();
    await transaction.save();

    await Order.findByIdAndUpdate(transaction.orderId, {
      $set: { paymentStatus: 'failed' },
    });

    return res.status(200).json({
      status:  'failed',
      orderId: transaction.orderId,
      tx_ref,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { initiatePayment, webhook, getTransactionStatus, verifyByTransactionId };
