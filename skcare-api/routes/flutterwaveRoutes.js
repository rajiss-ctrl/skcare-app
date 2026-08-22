// routes/flutterwaveRoutes.js
const express        = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const {
  initiatePayment,
  webhook,
  getTransactionStatus,
  verifyByTransactionId,
} = require('../controller/flutterwaveController');

const router = express.Router();

/**
 * POST /api/flutterwave/webhook
 *
 * CRITICAL: This route must receive the RAW body buffer — NOT the parsed JSON.
 * express.json() runs globally in app.js but we override it here with
 * express.raw() so the raw bytes are available for signature verification.
 *
 * This route is intentionally public (no authMiddleware) — Flutterwave
 * calls it directly. Security is provided by the verif-hash header check
 * inside the controller.
 */
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  webhook
);

/**
 * POST /api/flutterwave/initiate-payment
 * Authenticated — user must be signed in.
 * Body: { orderId }
 */
router.post('/initiate-payment', authMiddleware, initiatePayment);

/**
 * GET /api/flutterwave/transaction-status/:tx_ref
 * Authenticated — only the transaction owner can query.
 */
router.get('/transaction-status/:tx_ref', authMiddleware, getTransactionStatus);

/**
 * GET /api/flutterwave/verify/:transaction_id
 * PUBLIC — verifies a transaction by Flutterwave transaction ID.
 * Called by the frontend immediately after the modal callback fires.
 * Uses the transaction_id from Flutterwave's callback response which
 * cannot be guessed — it's issued by Flutterwave and tied to a real charge.
 * No auth token needed because the transaction_id itself is the proof.
 */
router.get('/verify/:transaction_id', verifyByTransactionId);

module.exports = router;
