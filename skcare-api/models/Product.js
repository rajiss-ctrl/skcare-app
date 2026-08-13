// models/Product.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type:     String,
      required: true,
      trim:     true,
    },
    description: {
      type:     String,
      required: true,
      trim:     true,
    },
    price: {
      type:     Number,
      required: true,
      min:      [0, 'Price cannot be negative'],
    },
    imageUrl: {
      type:     String,
      required: true,
    },
    // Track available stock — only enforced when trackStock is true
    stock: {
      type:    Number,
      default: 0,
      min:     [0, 'Stock cannot be negative'],
    },
    // When false, stock is not checked — useful for made-to-order or unlimited items
    // Existing products default to false so they are never blocked by stock checks
    trackStock: {
      type:    Boolean,
      default: false,
    },
    isActive: {
      type:    Boolean,
      default: true,
    },
    category: {
      type:  String,
      trim:  true,
    },
  },
  { timestamps: true }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────
productSchema.index({ name: 'text', description: 'text' }); // full-text search
productSchema.index({ category: 1 });
productSchema.index({ isActive: 1 });

module.exports = mongoose.model('Product', productSchema);
