// models/PaymentTransaction.js
const mongoose = require('mongoose');

/**
 * Tracks every payment attempt for idempotency and audit purposes.
 * A webhook event for a tx_ref that already has status 'success' or 'failed'
 * is silently ignored — preventing double-processing even if Flutterwave
 * retries the webhook multiple times.
 */
const paymentTransactionSchema = new mongoose.Schema(
  {
    // Unique transaction reference we generate — sent to Flutterwave and returned
    tx_ref: {
      type:     String,
      required: true,
      unique:   true,
      index:    true,
    },
    // Flutterwave's own transaction ID (populated after payment)
    flw_tx_id: {
      type: String,
    },
    orderId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Order',
      required: true,
    },
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    amount: {
      type:     Number,
      required: true,
      min:      0,
    },
    currency: {
      type:    String,
      default: 'NGN',
    },
    status: {
      type:    String,
      enum:    ['pending', 'success', 'failed'],
      default: 'pending',
    },
    // Raw webhook payload stored for audit — never use for business logic
    webhookPayload: {
      type: mongoose.Schema.Types.Mixed,
    },
    // ISO timestamp of when the webhook was last processed
    processedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────
paymentTransactionSchema.index({ orderId: 1, status: 1 });
// Ownership check in getTransactionStatus queries tx_ref + userId together
paymentTransactionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('PaymentTransaction', paymentTransactionSchema);
