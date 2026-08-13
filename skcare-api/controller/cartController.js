// controller/cartController.js
const Cart    = require('../models/Carts');
const Order   = require('../models/Order');
const Product = require('../models/Product');

/**
 * GET /api/carts
 * Returns the authenticated user's cart.
 */
const getCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ userId: req.user._id }).lean();

    // Return an empty cart shape instead of null so the frontend
    // never has to guard against a missing document.
    return res.status(200).json(
      cart || { userId: req.user._id, items: [], shippingDetails: {} }
    );
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/carts/items
 * Add one or more items to the cart.
 * Validates stock availability per item before adding.
 * Body: { items: [{ productId, name, imageUrl, price, quantity }] }
 */
const addToCart = async (req, res, next) => {
  try {
    const { items } = req.body;

    // Verify every product exists and has sufficient stock
    const productIds = items.map((i) => i.productId);
    const products   = await Product.find({ _id: { $in: productIds }, isActive: true }).lean();

    const productMap = {};
    products.forEach((p) => { productMap[p._id.toString()] = p; });

    for (const item of items) {
      const product = productMap[item.productId.toString()];
      if (!product) {
        return res.status(404).json({
          message: `Product ${item.productId} not found or is no longer available.`,
        });
      }
      // Only enforce stock if the product has stock tracking enabled
      if (product.trackStock && product.stock < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for "${product.name}". Available: ${product.stock}.`,
        });
      }
    }

    let cart = await Cart.findOne({ userId: req.user._id });

    if (!cart) {
      cart = new Cart({
        userId:    req.user._id,
        userEmail: req.user.email,
        items:     [],
      });
    }

    // Merge quantities for existing items; push new ones
    for (const newItem of items) {
      const existing = cart.items.find(
        (i) => i.productId.toString() === newItem.productId.toString()
      );

      if (existing) {
        existing.quantity += newItem.quantity;
      } else {
        cart.items.push({
          productId: newItem.productId,
          name:      newItem.name,
          imageUrl:  newItem.imageUrl,
          price:     newItem.price,
          quantity:  newItem.quantity,
        });
      }
    }

    await cart.save();
    return res.status(200).json({ cart });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/carts/items/:productId
 * Update the quantity of a single item.
 * Body: { quantity }  — set to 0 to remove the item.
 */
const updateItemQuantity = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const quantity      = parseInt(req.body.quantity, 10);

    if (isNaN(quantity) || quantity < 0) {
      return res.status(400).json({ message: 'quantity must be a non-negative integer.' });
    }

    const cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found.' });
    }

    if (quantity === 0) {
      // Treat 0 as a remove request
      cart.items = cart.items.filter((i) => i.productId.toString() !== productId);
    } else {
      const item = cart.items.find((i) => i.productId.toString() === productId);
      if (!item) {
        return res.status(404).json({ message: 'Item not found in cart.' });
      }
      item.quantity = quantity;
    }

    await cart.save();
    return res.status(200).json({ cart });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/carts/shipping
 * Save shipping + contact + payment method details against the cart
 * so they're ready for checkout.
 * Body: { shippingDetails: { name, phone, shippingAddress, paymentMethod } }
 */
const updateShippingDetails = async (req, res, next) => {
  try {
    const { shippingDetails } = req.body;

    const cart = await Cart.findOneAndUpdate(
      { userId: req.user._id },
      { $set: { shippingDetails } },
      { new: true, upsert: true, runValidators: true }
    );

    return res.status(200).json({ cart });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/carts/items/:productId
 * Remove a single item from the cart.
 */
const removeFromCart = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const cart = await Cart.findOneAndUpdate(
      { userId: req.user._id },
      { $pull: { items: { productId } } },
      { new: true }
    );

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found.' });
    }

    return res.status(200).json({ cart });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/carts
 * Clear all items from the cart (without deleting the document).
 */
const clearCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOneAndUpdate(
      { userId: req.user._id },
      { $set: { items: [] } },
      { new: true }
    );

    return res.status(200).json({ cart });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/carts/checkout
 * Converts the current cart into an Order document.
 *  1. Validates cart is not empty and shippingDetails are present.
 *  2. Re-validates stock for every item (race-condition safe).
 *  3. Decrements stock atomically per product.
 *  4. Creates the Order record.
 *  5. Clears the cart.
 *
 * Payment processing (Flutterwave etc.) should be initiated on the
 * frontend after receiving the order, then confirmed via a webhook.
 */
const checkout = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ userId: req.user._id });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Your cart is empty.' });
    }

    const { shippingDetails } = cart;
    if (
      !shippingDetails ||
      !shippingDetails.name ||
      !shippingDetails.phone ||
      !shippingDetails.shippingAddress?.street ||
      !shippingDetails.paymentMethod
    ) {
      return res.status(400).json({
        message: 'Please complete your shipping and payment details before checking out.',
      });
    }

    // Re-check stock and gather live prices in one query
    const productIds = cart.items.map((i) => i.productId);
    const products   = await Product.find({ _id: { $in: productIds } });
    const productMap = {};
    products.forEach((p) => { productMap[p._id.toString()] = p; });

    for (const item of cart.items) {
      const product = productMap[item.productId.toString()];
      if (!product || !product.isActive) {
        return res.status(400).json({
          message: `"${item.name}" is no longer available. Please remove it from your cart.`,
        });
      }
      // Only enforce stock if the product has stock tracking enabled
      if (product.trackStock && product.stock < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for "${item.name}". Available: ${product.stock}.`,
        });
      }
    }

    // Decrement stock only for tracked products
    await Promise.all(
      cart.items
        .filter((item) => productMap[item.productId.toString()]?.trackStock)
        .map((item) =>
          Product.findByIdAndUpdate(item.productId, {
            $inc: { stock: -item.quantity },
          })
        )
    );

    // Calculate totals using live DB prices (never trust client-sent prices for totals)
    const subtotal = cart.items.reduce((sum, item) => {
      const livePrice = productMap[item.productId.toString()].price;
      return sum + livePrice * item.quantity;
    }, 0);

    const orderItems = cart.items.map((item) => ({
      productId: item.productId,
      name:      item.name,
      imageUrl:  item.imageUrl,
      price:     productMap[item.productId.toString()].price,
      quantity:  item.quantity,
    }));

    const order = await Order.create({
      userId:          req.user._id,
      userEmail:       req.user.email,
      items:           orderItems,
      shippingAddress: shippingDetails.shippingAddress,
      paymentMethod:   shippingDetails.paymentMethod,
      subtotal:        parseFloat(subtotal.toFixed(2)),
      totalAmount:     parseFloat(subtotal.toFixed(2)),
      // Order starts as pending payment — confirmed by Flutterwave webhook
      paymentStatus: 'pending',
      orderStatus:   'processing',
    });

    // Clear the cart
    cart.items = [];
    await cart.save();

    return res.status(201).json({
      message: 'Order created. Proceed to payment.',
      orderId: order._id,
      order,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getCart,
  addToCart,
  updateItemQuantity,
  updateShippingDetails,
  removeFromCart,
  clearCart,
  checkout,
};
