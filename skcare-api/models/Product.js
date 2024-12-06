const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  imageUrl: { type: String, required: true }, // Store the Cloudinary URL
});

// Use `mongoose.model` to create a model from the schema
const Product = mongoose.model('Product', productSchema);

module.exports = Product;
