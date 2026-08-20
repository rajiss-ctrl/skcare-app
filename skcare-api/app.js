// app.js
const express      = require('express');
const dotenv       = require('dotenv');
const mongoose     = require('mongoose');
const cors         = require('cors');
const rateLimit    = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const compression  = require('compression');

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

// ─── Compression ─────────────────────────────────────────────────────────────
// Gzip/Brotli compress all responses > 1kb — reduces bandwidth by ~70%
app.use(compression());

// ─── Security & CORS ────────────────────────────────────────────────────

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',').map(o => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, server-to-server)
      if (!origin) return callback(null, true);
      // Allow exact matches from ALLOWED_ORIGINS env var
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // Allow all Vercel preview deployment URLs for this project
      if (origin.match(/^https:\/\/skcare-.*\.vercel\.app$/)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} is not allowed.`));
    },
    methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    credentials:    true,
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
//
// CURRENT: In-memory store (fine for a single instance / Render free tier).
//
// UPGRADE PATH — when you scale to 2+ instances, replace MemoryStore with
// a shared Redis store so all instances share the same counters:
//
//   npm install rate-limit-redis ioredis
//
//   const RedisStore = require('rate-limit-redis');
//   const Redis      = require('ioredis');
//   const redisClient = new Redis(process.env.REDIS_URL);
//
//   store: new RedisStore({
//     sendCommand: (...args) => redisClient.call(...args),
//   })
//
// Add REDIS_URL to your Render environment variables (Upstash Redis free tier
// works well: https://upstash.com — free 10k req/day).

// General API limiter — 200 req / 15 min per IP
const apiLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             200,
  standardHeaders: true,
  legacyHeaders:   false,
  // Skip rate-limiting for health checks
  skip: (req) => req.path === '/health',
  message: { error: 'TooManyRequests', message: 'Too many requests. Please try again later.' },
});

// Strict limiter for auth endpoints — brute-force protection
// 20 attempts per 15 min per IP
const authLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             20,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'TooManyRequests', message: 'Too many auth attempts. Please wait 15 minutes.' },
});

app.use(apiLimiter);

// ─── MongoDB connection ───────────────────────────────────────────────────────

mongoose
  .connect(process.env.MONGO_URI, {
    // ── Connection pool tuning ─────────────────────────────────────────────────
    // Default pool size is 5 — increase for production workloads.
    // Each Node process holds this many persistent connections to MongoDB.
    maxPoolSize:     parseInt(process.env.MONGO_POOL_SIZE || '10', 10),
    minPoolSize:     2,            // keep 2 warm connections always ready
    serverSelectionTimeoutMS: 5000,  // fail fast if Atlas is unreachable
    socketTimeoutMS:          45000, // kill idle sockets after 45s
    family: 4,                       // use IPv4, avoids lookup delays
  })
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
// Render, Railway, and uptime monitors poll this.
// Returns 200 only when the DB is connected — lets the platform restart
// the instance automatically if MongoDB drops.

app.get('/health', (_req, res) => {
  const dbState = mongoose.connection.readyState;
  const healthy = dbState === 1; // 1 = connected

  const mem   = process.memoryUsage();
  const mb    = (bytes) => Math.round(bytes / 1024 / 1024);

  const body = {
    status:   healthy ? 'ok' : 'degraded',
    uptime:   Math.round(process.uptime()),
    db:       healthy ? 'connected' : 'disconnected',
    memory: {
      rss:       `${mb(mem.rss)} MB`,
      heapUsed:  `${mb(mem.heapUsed)} MB`,
      heapTotal: `${mb(mem.heapTotal)} MB`,
    },
  };

  // Return 503 if DB is down — signals to Render to restart the dyno
  res.status(healthy ? 200 : 503).json(body);
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
