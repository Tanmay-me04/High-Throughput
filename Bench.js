// Autocannon benchmark — one endpoint at a time
// Usage: node bench.js <label> <product|category|report> [connections=100] [seconds=15]
// Example: node bench.js optimized product 100 15
const autocannon = require('autocannon');
const [, , label = 'run', path = 'product', conns = '100', dur = '15'] = process.argv;
 
// Hot set of 1000 keys (popular items get read repeatedly)
const pick = (n) => 1 + Math.floor(Math.random() * n);
const paths = {
  product: () => `/products/${pick(1000)}`,
  category: () => `/category/cat${pick(50) - 1}`,
  report: () => `/report/${pick(1000)}`,
};
 
autocannon({
  url: 'http://127.0.0.1:3000',
  connections: Number(conns),
  duration: Number(dur),
  requests: [{ setupRequest: (r) => ({ ...r, path: paths[path]() }) }],
}, (err, res) => {
  if (err) throw err;
  const l = res.latency;
  console.table([{
    label, endpoint: path, connections: Number(conns),
    'req/s': Math.round(res.requests.average),
    'p50 ms': l.p50, 'p99 ms': l.p99, 'max ms': l.max,
    errors: res.errors, timeouts: res.timeouts,
  }]);
});
