// app.js
const express      = require('express');
const dotenv       = require('dotenv');
const mongoose     = require('mongoose');
const cors         = require('cors');
const rateLimit    = require('express-rate-limit');
const cookieParser = require('cookie-parser');

// Load env vars before anything else
dotenv.config();

// ─── Validate required environment variables at startup ──────────────────────
const REQUIRED_ENV = ['MONGO_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
const missingEnv   = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missingEnv.length) {
  console.error(`❌ Missing required environment variables: ${missingEnv.join(', ')}`);
  process.exit(1);
}

// Warn if JWT secrets are still placeholders
if (process.env.JWT_SECRET.startsWith('replace_with')) {
  console.warn('⚠️  WARNING: JWT_SECRET is still set to a placeholder. Update your .env file.');
}

const app = express();

// ─── Security & CORS ────────────────────────────────────────────────────

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',').map(o => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} is not allowed.`));
    },
    methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    credentials:    true, // required for httpOnly refresh token cookie
  })
);

// Trust proxy — needed for accurate IP rate-limiting behind a reverse proxy / Render / Railway
app.set('trust proxy', 1);

// Remove the X-Powered-By header so the tech stack isn't advertised
app.disable('x-powered-by');

// ─── Body parsers ─────────────────────────────────────────────────────────────

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(cookieParser()); // parse httpOnly cookies for refresh token

// ─── Rate limiters ────────────────────────────────────────────────────────────

// General API limiter — applies to all routes
const apiLimiter = rateLimit({
  windowMs:         15 * 60 * 1000, // 15 minutes
  max:              200,
  standardHeaders:  true,
  legacyHeaders:    false,
  message:          { error: 'TooManyRequests', message: 'Too many requests. Please try again later.' },
});

// Stricter limiter for authentication endpoints — brute-force protection
const authLimiter = rateLimit({
  windowMs:         15 * 60 * 1000, // 15 minutes
  max:              20,
  standardHeaders:  true,
  legacyHeaders:    false,
  message:          { error: 'TooManyRequests', message: 'Too many auth attempts. Please wait 15 minutes.' },
});

app.use(apiLimiter);

// ─── MongoDB connection ───────────────────────────────────────────────────────

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ MongoDB connected');
    // Drop stale indexes from old Firebase schema that conflict with new schema
    try {
      const userCollection = mongoose.connection.collection('users');
      const indexes = await userCollection.indexes();
      const staleIndexNames = ['uid_1', 'uid_1_email_1'];
      for (const index of indexes) {
        if (staleIndexNames.includes(index.name)) {
          await userCollection.dropIndex(index.name);
          console.log(`🧹 Dropped stale index: ${index.name}`);
        }
      }
    } catch (err) {
      // Non-fatal — indexes may already be gone
      if (!err.message?.includes('index not found')) {
        console.warn('⚠️  Index cleanup warning:', err.message);
      }
    }
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });

// Graceful shutdown — close DB connection when process terminates
process.on('SIGINT',  () => mongoose.connection.close().then(() => process.exit(0)));
process.on('SIGTERM', () => mongoose.connection.close().then(() => process.exit(0)));

// ─── Routes ───────────────────────────────────────────────────────────────────

const authRoutes         = require('./routes/authRoutes');
const userRoutes         = require('./routes/userRoutes');
const productRoutes      = require('./routes/productRoutes');
const cartRoutes         = require('./routes/cartRoutes');
const orderRoutes        = require('./routes/orderRoutes');
const flutterwaveRoutes  = require('./routes/flutterwaveRoutes');

// Auth endpoints get the stricter rate limiter
app.use('/api/auth',        authLimiter, authRoutes);
app.use('/api/users',       userRoutes);
app.use('/api/products',    productRoutes);
app.use('/api/carts',       cartRoutes);
app.use('/api/orders',      orderRoutes);
app.use('/api/flutterwave', flutterwaveRoutes);

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.status(200).json({
    status:   'ok',
    uptime:   process.uptime(),
    dbState:  mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// ─── 404 handler ─────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: 'NotFound', message: 'The requested resource does not exist.' });
});

// ─── Centralised error handler (must be last) ─────────────────────────────────

const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

// ─── Start server ─────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`   Environment : ${process.env.NODE_ENV || 'development'}`);
});
