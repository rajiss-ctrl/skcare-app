// controller/authController.js
const jwt  = require('jsonwebtoken');
const User = require('../models/Users');
const Cart = require('../models/Carts');

// ─── Token helpers ────────────────────────────────────────────────────────────

const signAccessToken = (userId) =>
  jwt.sign(
    { sub: userId.toString() },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );

const signRefreshToken = (userId) =>
  jwt.sign(
    { sub: userId.toString() },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

const pruneRefreshTokens = (user) => {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  user.refreshTokens = (user.refreshTokens || []).filter(
    (t) => new Date(t.createdAt).getTime() > cutoff
  );
};

const setRefreshCookie = (res, token) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('skcare_rt', token, {
    httpOnly: true,
    secure:   true,
    sameSite: isProd ? 'none' : 'strict',
    maxAge:   7 * 24 * 60 * 60 * 1000,
    path:     '/api/auth',
  });
};

const clearRefreshCookie = (res) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie('skcare_rt', {
    httpOnly: true,
    secure:   true,
    sameSite: isProd ? 'none' : 'strict',
    path:     '/api/auth',
  });
};

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * POST /api/auth/signup
 * Body: { email, password, name? }
 */
const signup = async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'An account with that email already exists.' });
    }

    const user = await User.create({ email, password, name: name?.trim() });

    const accessToken  = signAccessToken(user._id);
    const refreshToken = signRefreshToken(user._id);

    user.refreshTokens = [{ token: refreshToken }];
    user.lastLogin     = new Date();
    await user.save();

    setRefreshCookie(res, refreshToken);

    return res.status(201).json({
      user:        user.toPublicJSON(),
      accessToken,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/signin
 * Body: { email, password }
 */
const signin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password +refreshTokens');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const accessToken  = signAccessToken(user._id);
    const refreshToken = signRefreshToken(user._id);

    pruneRefreshTokens(user);
    user.refreshTokens.push({ token: refreshToken });
    user.lastLogin = new Date();
    await user.save();

    setRefreshCookie(res, refreshToken);

    return res.status(200).json({
      user:        user.toPublicJSON(),
      accessToken,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/register-checkout
 * For anonymous (unauthenticated) users checking out.
 *
 * Does three things atomically:
 *  1. Creates a real user account with the provided credentials.
 *  2. Saves the cart items (sent from sessionStorage) to the DB.
 *  3. Issues full auth tokens so the user is immediately logged in.
 *
 * If the email is already registered, returns 409 so the frontend
 * can redirect the user to sign in instead.
 *
 * Body: {
 *   email, password, name,
 *   cartItems: [{ productId, name, imageUrl, price, quantity }],
 * }
 *
 * This endpoint is PUBLIC — no auth token required (user has none yet).
 */
const registerAndCheckout = async (req, res, next) => {
  try {
    const { email, password, name, cartItems = [] } = req.body;

    // Check email uniqueness
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({
        message: 'An account with that email already exists. Please sign in to continue.',
        emailExists: true,
      });
    }

    // Create the new account — password is hashed by pre-save hook
    const user = await User.create({
      email:      email.toLowerCase().trim(),
      password,
      name:       name?.trim() || 'User',
      roles:      ['user'],
      isVerified: false,
    });

    // Save cart items to DB if any were in sessionStorage
    if (cartItems.length > 0) {
      // Sanitise: only keep fields the schema expects, reject unknown fields
      const sanitisedItems = cartItems.map((item) => ({
        productId: item.productId,
        name:      String(item.name).slice(0, 200),
        imageUrl:  String(item.imageUrl).slice(0, 500),
        price:     Number(item.price)    || 0,
        quantity:  Math.max(1, Math.floor(Number(item.quantity) || 1)),
      }));

      await Cart.create({
        userId:    user._id,
        userEmail: user.email,
        items:     sanitisedItems,
      });
    }

    // Issue full tokens — user is now signed in
    const accessToken  = signAccessToken(user._id);
    const refreshToken = signRefreshToken(user._id);

    user.refreshTokens = [{ token: refreshToken }];
    user.lastLogin     = new Date();
    await user.save();

    setRefreshCookie(res, refreshToken);

    return res.status(201).json({
      user:        user.toPublicJSON(),
      accessToken,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/refresh
 * Reads the refresh token from the httpOnly cookie.
 */
const refresh = async (req, res, next) => {
  try {
    const token = req.cookies?.skcare_rt;
    if (!token) {
      return res.status(401).json({ message: 'No refresh token. Please sign in.' });
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch {
      clearRefreshCookie(res);
      return res.status(401).json({ message: 'Invalid or expired refresh token.' });
    }

    const user = await User.findById(payload.sub).select('+refreshTokens');
    if (!user) {
      clearRefreshCookie(res);
      return res.status(401).json({ message: 'User not found.' });
    }

    const tokenExists = user.refreshTokens.some((t) => t.token === token);
    if (!tokenExists) {
      user.refreshTokens = [];
      await user.save();
      clearRefreshCookie(res);
      return res.status(401).json({ message: 'Session invalidated. Please sign in again.' });
    }

    user.refreshTokens = user.refreshTokens.filter((t) => t.token !== token);
    pruneRefreshTokens(user);

    const newAccessToken  = signAccessToken(user._id);
    const newRefreshToken = signRefreshToken(user._id);
    user.refreshTokens.push({ token: newRefreshToken });
    await user.save();

    setRefreshCookie(res, newRefreshToken);

    return res.status(200).json({ accessToken: newAccessToken });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/signout
 */
const signout = async (req, res, next) => {
  try {
    const token = req.cookies?.skcare_rt;
    if (token) {
      await User.findByIdAndUpdate(req.user._id, {
        $pull: { refreshTokens: { token } },
      });
    }
    clearRefreshCookie(res);
    return res.status(200).json({ message: 'Signed out successfully.' });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/signout-all
 */
const signoutAll = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { $set: { refreshTokens: [] } });
    clearRefreshCookie(res);
    return res.status(200).json({ message: 'Signed out from all devices.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { signup, signin, registerAndCheckout, refresh, signout, signoutAll };
