# SKCare API — Scalability Reference

## Current Architecture Capabilities

| Load Level | Users/day | Monthly Orders | What handles it |
|---|---|---|---|
| **Now** | ~1,000 | ~500 | Single Render instance + Atlas M0 |
| **Growth** | ~10,000 | ~5,000 | Single Render instance + Atlas M2 ($9/mo) |
| **Scale** | ~100,000 | ~50,000 | Multiple instances + Atlas M10 + Redis |
| **Enterprise** | 1M+ | 500,000+ | Kubernetes + Atlas M30+ + CDN + queues |

---

## What Is Already Done

- **Stateless JWT** — any number of server instances can verify tokens independently
- **MongoDB Atlas** — managed replica set, automatic failover
- **Connection pooling** — `maxPoolSize: 10` per instance (configurable via `MONGO_POOL_SIZE`)
- **Gzip compression** — all responses compressed, ~70% bandwidth reduction
- **Pagination** — all list endpoints are paginated, no unbounded queries
- **Atomic stock decrement** — race-condition safe concurrent checkout
- **Aggregation for stats** — dashboard stats use `$facet` pipeline, O(1) regardless of order count
- **HTTP cache headers** — public product listings cached 60s / stale-while-revalidate 5min
- **Compound indexes** — orders, products, payment transactions all properly indexed
- **Rate limiting** — 200 req/15min general, 20 req/15min auth endpoints
- **Health check at `/health`** — returns 503 if DB is down (triggers Render auto-restart)
- **Graceful shutdown** — drains requests before closing on SIGTERM/SIGINT

---

## Stage 1 — When you hit ~10,000 users/day

### Upgrade Atlas to M2 ($9/month)
- Dedicated RAM, no cold starts, better query performance
- Dashboard → your cluster → Edit Configuration → M2

### Increase connection pool
```env
MONGO_POOL_SIZE=20
```

### Enable Render auto-scaling
- Render dashboard → your service → Scaling → set min 1, max 3 instances

---

## Stage 2 — When you hit ~100,000 users/day

### Add Redis for shared rate limiting

When running 2+ instances, rate limit counters must be shared.

```bash
npm install rate-limit-redis ioredis
```

In `app.js`, replace `rateLimit({...})` stores with:

```js
const RedisStore  = require('rate-limit-redis');
const Redis       = require('ioredis');
const redisClient = new Redis(process.env.REDIS_URL);

// Add to both apiLimiter and authLimiter:
store: new RedisStore({
  sendCommand: (...args) => redisClient.call(...args),
})
```

**Free Redis option:** [Upstash](https://upstash.com) — 10,000 req/day free, $0.2/100k req after.

Add to Render environment:
```
REDIS_URL=rediss://your-upstash-url
```

### Add a CDN in front of the API
- [Cloudflare](https://cloudflare.com) — free plan caches GET responses at edge
- Point your custom domain through Cloudflare → your Render URL
- Product listings will be served from CDN edge nodes worldwide

### Upgrade Atlas to M10 ($57/month)
- Dedicated cluster, read replicas, automated backups
- Add a read replica for product/order reads:
  ```js
  mongoose.connect(MONGO_URI, { readPreference: 'secondaryPreferred' })
  ```

---

## Stage 3 — When you hit 1M+ users/day

At this scale you need architectural changes beyond this document:

- **Separate services** — split auth, orders, products into microservices
- **Message queue** — use BullMQ/RabbitMQ for order processing and emails
- **Search engine** — replace MongoDB text search with Elasticsearch/Typesense
- **Image CDN** — Cloudinary is already handled correctly
- **Database sharding** — Atlas auto-sharding on M30+

---

## Environment Variables to Set on Render

| Variable | Value | Purpose |
|---|---|---|
| `NODE_ENV` | `production` | Enables production error handling, secure cookies |
| `MONGO_POOL_SIZE` | `10` | MongoDB connection pool size per instance |
| `ALLOWED_ORIGINS` | `https://skcare-app.vercel.app` | CORS whitelist |

---

## Monitoring Checklist

- [ ] Set up Render health check on `/health` (auto-restart on 503)
- [ ] Monitor MongoDB Atlas → Performance Advisor for slow queries
- [ ] Set up uptime monitor (UptimeRobot — free) on `https://your-api.onrender.com/health`
- [ ] Enable Atlas alerts for connection count, disk usage, query time
