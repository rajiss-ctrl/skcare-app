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

/**
 * Sets the refresh token as a secure httpOnly cookie.
 * JavaScript in the browser cannot read this cookie — it is XSS-proof.
 * SameSite=Strict prevents CSRF attacks.
 */
const setRefreshCookie = (res, token) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('skcare_rt', token, {
    httpOnly: true,
    secure:   true,                           // always true — Render uses HTTPS
    sameSite: isProd ? 'none' : 'strict',     // 'none' required for cross-origin (Vercel → Render)
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
 * Returns: { user, accessToken }  — refresh token set as httpOnly cookie
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
 * Returns: { user, accessToken }  — refresh token set as httpOnly cookie
 */
const signin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Allow both regular users and the shared guest account
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
 * POST /api/auth/guest
 * Signs in with the shared seeded guest account.
 * No new documents are created — the frontend uses fixed credentials
 * from the seed script. The guest can convert at checkout.
 */
const guestSignin = async (req, res, next) => {
  try {
    const guestEmail    = process.env.GUEST_EMAIL?.toLowerCase();
    const guestPassword = process.env.GUEST_PASSWORD;

    if (!guestEmail || !guestPassword) {
      return res.status(503).json({
        message: 'Guest account is not configured. Please run: npm run seed:guest',
      });
    }

    const user = await User.findOne({ email: guestEmail, isGuest: true })
                           .select('+password +refreshTokens');

    if (!user) {
      return res.status(503).json({
        message: 'Guest account not found. Please run: npm run seed:guest',
      });
    }

    const valid = await user.comparePassword(guestPassword);
    if (!valid) {
      return res.status(503).json({
        message: 'Guest account credentials mismatch. Re-run: npm run seed:guest',
      });
    }

    // Issue a short-lived access token — guests don't get a refresh token
    const accessToken = jwt.sign(
      { sub: user._id.toString(), isGuest: true },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    return res.status(200).json({
      user:  user.toPublicJSON(),
      accessToken,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/convert
 * Converts a guest session into a permanent registered account.
 *
 * Case A — email already registered: merge cart, delete guest, return 409+cartMerged.
 * Case B — fresh email: promote guest doc in-place, issue full tokens.
 *
 * Returns: { user, accessToken } — refresh token set as httpOnly cookie (Case B only)
 */
const convertGuest = async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    if (!req.user.isGuest) {
      return res.status(400).json({ message: 'This account is already a full account.' });
    }

    const guestUserId = req.user._id;

    // ── Case A: email belongs to an existing real account ────────────────────
    const existingAccount = await User.findOne({
      email,
      isGuest: false,
      _id:     { $ne: guestUserId },
    });

    if (existingAccount) {
      const guestCart    = await Cart.findOne({ userId: guestUserId });
      const existingCart = await Cart.findOne({ userId: existingAccount._id });

      if (guestCart && guestCart.items.length > 0) {
        if (existingCart) {
          for (const guestItem of guestCart.items) {
            const match = existingCart.items.find(
              (i) => i.productId.toString() === guestItem.productId.toString()
            );
            if (match) {
              match.quantity += guestItem.quantity;
            } else {
              existingCart.items.push(guestItem);
            }
          }
          await existingCart.save();
        } else {
          guestCart.userId    = existingAccount._id;
          guestCart.userEmail = existingAccount.email;
          await guestCart.save();
        }
      }

      await Cart.deleteOne({ userId: guestUserId });
      await User.findByIdAndDelete(guestUserId);

      return res.status(409).json({
        message:    'That email is already registered. Your cart items have been saved. Please sign in.',
        cartMerged: true,
      });
    }

    // ── Case B: fresh email — promote the guest document ─────────────────────
    req.user.email      = email;
    req.user.name       = name?.trim() || 'User';
    req.user.password   = password;
    req.user.isGuest    = false;
    req.user.guestToken = undefined;
    req.user.lastLogin  = new Date();

    await Cart.updateOne(
      { userId: guestUserId },
      { $set: { userEmail: email } }
    );

    const accessToken  = signAccessToken(guestUserId);
    const refreshToken = signRefreshToken(guestUserId);

    req.user.refreshTokens = [{ token: refreshToken }];
    await req.user.save();

    setRefreshCookie(res, refreshToken);

    return res.status(200).json({
      user:        req.user.toPublicJSON(),
      accessToken,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/refresh
 * Reads the refresh token from the httpOnly cookie (not the body).
 * Returns: { accessToken } — rotates the cookie with a new refresh token.
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
      // Refresh token reuse — possible theft, invalidate all sessions
      user.refreshTokens = [];
      await user.save();
      clearRefreshCookie(res);
      return res.status(401).json({ message: 'Session invalidated. Please sign in again.' });
    }

    // Rotate — remove old, issue new
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
 * Removes the cookie token from the DB and clears the cookie.
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
 * Wipes all refresh tokens and clears the cookie.
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

module.exports = { signup, signin, guestSignin, convertGuest, refresh, signout, signoutAll };
