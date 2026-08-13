// models/Order.js
const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name:      { type: String, required: true },
  imageUrl:  { type: String, required: true },
  price:     { type: Number, required: true, min: 0 },
  quantity:  { type: Number, required: true, min: 1 },
});

const shippingAddressSchema = new mongoose.Schema({
  street:  { type: String, required: true, trim: true },
  city:    { type: String, required: true, trim: true },
  state:   { type: String, required: true, trim: true },
  zipCode: { type: String, required: true, trim: true },
  country: { type: String, required: true, trim: true },
});

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    userEmail: {
      type:     String,
      required: true,
    },
    items: {
      type:     [orderItemSchema],
      required: true,
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message:   'Order must contain at least one item',
      },
    },
    shippingAddress: {
      type:     shippingAddressSchema,
      required: true,
    },
    paymentMethod: {
      type:     String,
      required: true,
      enum:     ['card', 'bank_transfer', 'paypal', 'flutterwave'],
    },
    paymentStatus: {
      type:    String,
      enum:    ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    orderStatus: {
      type:    String,
      enum:    ['processing', 'confirmed', 'shipped', 'delivered', 'cancelled'],
      default: 'processing',
    },
    // subtotal before shipping / tax
    subtotal: { type: Number, required: true, min: 0 },
    // room for shipping cost and tax to be added later
    shippingCost: { type: Number, default: 0, min: 0 },
    tax:          { type: Number, default: 0, min: 0 },
    totalAmount:  { type: Number, required: true, min: 0 },
    // populated after payment gateway callback
    paymentReference: { type: String },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1 });

module.exports = mongoose.model('Order', orderSchema);
