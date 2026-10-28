// Fastify + PostgreSQL + Redis benchmark server
//
// MODE=baseline  -> every request hits PostgreSQL; /report uses blocking sync crypto
// MODE=async     -> no cache; /report uses non-blocking async crypto (isolates the event-loop fix)
// MODE=optimized -> Redis cache-aside (TTL 60s) + non-blocking /report
const fastify = require('fastify')({ logger: false });
const { Pool } = require('pg');
const Redis = require('ioredis');
const crypto = require('crypto');
const { promisify } = require('util');
const pbkdf2 = promisify(crypto.pbkdf2);
 
const MODE = process.env.MODE || 'baseline';
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/bench';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const TTL = 60; // seconds
 
// Connection pool: 10 reusable connections shared by all requests
const pool = new Pool({ connectionString: DATABASE_URL, max: 10 });
const redis = MODE === 'optimized' ? new Redis(REDIS_URL) : null;
 
// Cache-aside: check Redis -> on miss, load from DB and store with TTL
async function cached(key, loader) {
  if (!redis) return loader();
  try {
    const hit = await redis.get(key);
    if (hit) return JSON.parse(hit);
  } catch (_) { /* Redis down -> fall back to DB */ }
  const val = await loader();
  redis.set(key, JSON.stringify(val), 'EX', TTL).catch(() => {});
  return val;
}
 
// Point lookup by primary key
fastify.get('/products/:id', async (req) => {
  const id = Number(req.params.id);
  return cached(`product:${id}`, async () =>
    (await pool.query('SELECT * FROM products WHERE id=$1', [id])).rows[0]);
});
 
// Heavier query: filter + sort (no index on category -> full table scan)
fastify.get('/category/:cat', async (req) => {
  const cat = req.params.cat;
  return cached(`category:${cat}`, async () =>
    (await pool.query(
      'SELECT id,name,price FROM products WHERE category=$1 ORDER BY price DESC LIMIT 20', [cat])).rows);
});
 
// CPU-heavy endpoint: sync crypto blocks the event loop in baseline mode
fastify.get('/report/:id', async (req) => {
  const id = req.params.id;
  if (MODE === 'baseline') {
    const h = crypto.pbkdf2Sync(id, 'salt', 20000, 32, 'sha256'); // blocks the single JS thread
    return { id, sig: h.toString('hex') };
  }
  return cached(`report:${id}`, async () => {
    const h = await pbkdf2(id, 'salt', 20000, 32, 'sha256'); // runs on libuv threadpool
    return { id, sig: h.toString('hex') };
  });
});
 
fastify.listen({ port: 3000, host: '127.0.0.1' })
  .then(() => console.log(`Server running on http://127.0.0.1:3000 in ${MODE} mode`))
  .catch((e) => { console.error(e); process.exit(1); });
