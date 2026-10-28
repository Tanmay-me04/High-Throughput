# High-Throughput API Benchmark

A Fastify + PostgreSQL + Redis API benchmarked in three modes:

| Mode | What it does |
|---|---|
| `baseline` | Every request hits PostgreSQL; `/report` uses blocking sync crypto |
| `async` | No cache; `/report` uses non-blocking async crypto (isolates the event-loop fix) |
| `optimized` | Redis cache-aside (60 s TTL) + non-blocking `/report` |

Endpoints: `GET /products/:id`, `GET /category/:cat`, `GET /report/:id`

## 1. Install prerequisites (one time)

- **Node.js 18+** — https://nodejs.org
- **Docker Desktop** — https://www.docker.com/products/docker-desktop (runs PostgreSQL + Redis)
- **k6**
  - Windows: `winget install k6 --source winget`  (or `choco install k6`)
  - macOS: `brew install k6`
  - Linux: see https://grafana.com/docs/k6/latest/set-up/install-k6/

## 2. Start PostgreSQL and Redis

```bash
cd high-throughput-bench
docker compose up -d
```
This also creates the `products` table with 100,000 rows (from `seed.sql`).
Wait ~10 seconds the first time, then check: `docker compose ps` (both should be "running").

## 3. Install Node packages

```bash
npm install
```

## 4. Run the benchmark

Use **two terminals**: one for the server, one for the load test.

**Terminal 1 — start the server in baseline mode**
```bash
npm run start:baseline
```

**Terminal 2 — run the k6 test**
```bash
k6 run load.js
```
Write down `http_reqs` (req/s), `http_req_duration` (med, p95, p99) and `checks`.

Then stop the server (Ctrl+C in Terminal 1), and repeat with:
```bash
npm run start:optimized
```
```bash
docker compose exec redis redis-cli FLUSHALL   # optional: start with an empty cache
k6 run load.js
```

## 5. Optional: per-endpoint numbers with Autocannon

With a server running:
```bash
node bench.js baseline product 100 15
node bench.js baseline category 100 15
node bench.js baseline report 100 15
```
(Change the first word to match the mode you started the server in — it's just a label.)

## What to read in the k6 output

```
checks.........: 100.00%  1131033 out of 1131033    <- success rate
http_req_duration: med=8.75ms p(95)=23.29ms ...      <- latency
http_reqs......: 1131033  9424.45/s                  <- total requests and req/s
```

## Reference results (2 vCPU Linux, k6 + server on same machine, 100 VUs)

| Mode | Duration | Requests | Req/s | Median | p95 | Failed |
|---|---|---|---|---|---|---|
| baseline | 1 min | 39,661 | ~660 | 154 ms | 242 ms | 0% |
| optimized | 2 min | 1,131,033 | ~9,400 | 8.8 ms | 23 ms | 0% |

Your numbers will differ by machine — use your own on the resume.

## Tips for fair results

- Close heavy apps (browser tabs, IDE indexing) while testing.
- Plug in your laptop — battery mode throttles the CPU.
- Run each test 2–3 times and use the middle value.
- Always compare modes on the same machine with the same settings.

## Clean up

```bash
docker compose down        # stop PostgreSQL + Redis
docker compose down -v     # also delete the data
```
