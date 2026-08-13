// middleware/authMiddleware.js
const jwt  = require('jsonwebtoken');
const User = require('../models/Users');

/**
 * Verifies the Bearer JWT in the Authorization header.
 * On success, attaches the full Mongoose user document to req.user.
 * On failure, responds with 401.
 */
const authMiddleware = async (req, res, next) => {
  try {
    const header = req.headers['authorization'];

    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({
        error:   'Unauthorized',
        message: 'Authorization header missing or malformed. Expected: Bearer <token>',
      });
    }

    const token = header.split(' ')[1];

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          error:   'TokenExpired',
          message: 'Access token has expired. Please refresh your token.',
        });
      }
      return res.status(401).json({
        error:   'InvalidToken',
        message: 'Access token is invalid.',
      });
    }

    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(401).json({
        error:   'Unauthorized',
        message: 'The account associated with this token no longer exists.',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = authMiddleware;
