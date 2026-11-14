// Local stub of the kerr-finder API for the blocking finder-check job (tracker 293), so a layout
// check never depends on the live dev search service. Serves GET /finder/v1/search (name filter on
// q, residences only for domain=recovery_housing) and /finder/v1/crisis with fixed fixtures, CORS open.
//   node scripts/finder-stub-api.mjs [port]      (default 1314; pair with deploy/finder-stub.toml)
import { createServer } from 'node:http';

const PORT = Number(process.argv[2] || 1314);
const rec = (id, name, extra) => ({ id, kind: 'service', name, town: 'Ashburn', type_label: 'Outpatient', lat: 39.04, lng: -77.49, facets: {}, checked: {}, ...extra });
export const FIXTURES = [
  rec('s1', 'Ashburn Clinic'),
  rec('s2', 'Roanoke Valley Counseling', { town: 'Roanoke', lat: 37.27, lng: -79.94 }),
  rec('s3', 'Brightview Treatment', { town: 'Richmond', lat: 37.54, lng: -77.44 }),
  rec('res-1', 'Atlantic House', { kind: 'residence', type_label: 'Recovery housing', operator: 'Atlantic Outreach Group', town: 'Norfolk', lat: 36.85, lng: -76.29 }),
  rec('res-2', 'Harbor Home', { kind: 'residence', type_label: 'Recovery housing', operator: 'Harbor Recovery', town: 'Hampton', lat: 37.03, lng: -76.35 }),
];

export function search(params) {
  const q = (params.get('q') || '').trim().toLowerCase();
  const domain = params.get('domain') || '';
  let rows = FIXTURES;
  if (domain.split(',').includes('recovery_housing')) rows = rows.filter((r) => r.kind === 'residence');
  if (q) rows = rows.filter((r) => [r.name, r.operator || '', r.town].some((s) => s.toLowerCase().includes(q)));
  return { total: rows.length, results: rows };
}

createServer((req, res) => {
  const u = new URL(req.url, 'http://stub');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, accept, content-type');
  res.setHeader('content-type', 'application/json');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (u.pathname === '/finder/v1/search') { res.end(JSON.stringify(search(u.searchParams))); return; }
  if (u.pathname === '/finder/v1/crisis') { res.end(JSON.stringify({ lines: [] })); return; }
  res.statusCode = 404; res.end(JSON.stringify({ error: 'stub: no such route ' + u.pathname }));
}).listen(PORT, '127.0.0.1', () => console.log('finder stub API on 127.0.0.1:' + PORT));
