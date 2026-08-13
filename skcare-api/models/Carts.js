// models/Carts.js
const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  productId: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'Product',
    required: true,
  },
  name:     { type: String, required: true },
  imageUrl: { type: String, required: true },
  price:    { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 1 },
});

const shippingAddressSchema = new mongoose.Schema({
  street:  { type: String, trim: true },
  city:    { type: String, trim: true },
  state:   { type: String, trim: true },
  zipCode: { type: String, trim: true },
  country: { type: String, trim: true },
});

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      unique:   true, // one cart per user
    },
    userEmail: { type: String, required: true },
    // Shipping / contact details filled in at checkout
    shippingDetails: {
      name:            { type: String, trim: true },
      phone:           { type: String, trim: true },
      shippingAddress: shippingAddressSchema,
      paymentMethod:   {
        type: String,
        enum: ['card', 'bank_transfer', 'paypal', 'flutterwave', null],
      },
    },
    items: { type: [cartItemSchema], default: [] },
  },
  { timestamps: true }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
// userId index is already created by `unique: true` on the field — no duplicate needed

module.exports = mongoose.model('Cart', cartSchema);
