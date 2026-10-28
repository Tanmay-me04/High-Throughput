// k6 load test — mixed realistic traffic
// Run:  k6 run load.js            (2 minutes, default)
//       k6 run -e DUR=1m load.js  (custom duration)
import http from 'k6/http';
import { check } from 'k6';
 
export const options = {
  vus: 100,                       // 100 concurrent virtual users
  duration: __ENV.DUR || '2m',
  thresholds: { http_req_failed: ['rate<0.01'] }, // fail the test if >1% errors
  summaryTrendStats: ['avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};
 
const r = (n) => 1 + Math.floor(Math.random() * n);
 
// 70% item lookups, 20% category lists, 10% CPU-heavy reports
export default function () {
  const x = Math.random();
  let path;
  if (x < 0.7) path = `/products/${r(1000)}`;
  else if (x < 0.9) path = `/category/cat${r(50) - 1}`;
  else path = `/report/${r(1000)}`;
  const res = http.get(`http://127.0.0.1:3000${path}`);
  check(res, { 'status is 200': (s) => s.status === 200 });
}
