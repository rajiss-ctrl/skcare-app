const Carts = require("../models/Carts");


exports.getCart = async (req, res) => {
  const { userId } = req.params;

  // Ensure the userId matches the authenticated user's uid
  if (req.user.uid !== userId) {
    return res.status(403).json({ error: 'Access denied: User ID mismatch' });
  }

  try {
    const cart = await Carts.findOne({ userId });
    res.status(200).json(cart || { userId, items: [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
};

exports.updateCart = async (req, res) => {
  const { userId } = req.params;
  const { userEmail, userName, userPhone, items } = req.body;

  console.log("Request body:", req.body); // Debugging log

  if (!userId || !userEmail) {
    return res.status(400).json({ error: "userId and userEmail are required" });
  }

  try {
    const cart = await Carts.findOneAndUpdate(
      { userId },
      { userId, userEmail, userName, userPhone, items },
      { upsert: true, new: true }
    );
    res.status(200).json(cart);
  } catch (err) {
    console.error("Error updating cart:", err);
    res.status(500).json({ error: "Failed to update cart", details: err.message });
  }
};
