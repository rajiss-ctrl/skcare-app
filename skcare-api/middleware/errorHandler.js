// middleware/errorHandler.js

/**
 * Centralised Express error handler.
 * Must be registered LAST in app.js (after all routes).
 *
 * Catches errors passed via next(err) from any route or middleware.
 * Never leaks stack traces to the client in production.
 */
const errorHandler = (err, req, res, next) => {  // eslint-disable-line no-unused-vars
  const isDev = process.env.NODE_ENV === 'development';

  // ── Safe server-side logging ──────────────────────────────────────────────
  // Never log req.body — it may contain passwords or tokens.
  // Log only the method, path, error name, and message.
  console.error(
    `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} — ` +
    `${err.name || 'Error'}: ${err.message}`
  );

  // ── Mongoose validation error ─────────────────────────────────────────────
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => ({
      field:   e.path,
      message: e.message,
    }));
    return res.status(400).json({ error: 'ValidationError', details: errors });
  }

  // ── Mongoose duplicate key ────────────────────────────────────────────────
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({
      error:   'DuplicateKey',
      message: `A record with that ${field} already exists.`,
    });
  }

  // ── Mongoose bad ObjectId ─────────────────────────────────────────────────
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    return res.status(400).json({ error: 'InvalidId', message: 'The provided ID is invalid.' });
  }

  // ── JWT errors (shouldn't reach here normally, but just in case) ──────────
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Unauthorized', message: err.message });
  }

  // ── Multer errors ─────────────────────────────────────────────────────────
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'FileTooLarge', message: 'Uploaded file exceeds size limit.' });
  }

  // ── Fallback ──────────────────────────────────────────────────────────────
  const status  = err.status || err.statusCode || 500;
  const message = status < 500 ? err.message : 'An unexpected error occurred. Please try again.';

  return res.status(status).json({
    error:   err.name || 'ServerError',
    message,
    // Only expose stack in development
    ...(isDev && { stack: err.stack }),
  });
};

module.exports = errorHandler;
