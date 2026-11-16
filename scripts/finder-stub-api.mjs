// Local stub of the kerr-finder API for the blocking finder-check job (tracker 293), so a layout
// check never depends on the live dev search service. Serves GET /finder/v1/search (name filter on
// q, residences only when domain is exactly recovery_housing (the page's default sends all four types), org=<id> keeps listings with that organization) and /finder/v1/crisis with fixed fixtures, CORS open. Every listing carries organizations: [{id,name}] ([] when none), as
// kerr-finder 4b365c0 does (internal/catalog/catalog.go Org; internal/api/http.go parses org).
//   node scripts/finder-stub-api.mjs [port]      (default 1314; pair with deploy/finder-stub.toml)
import { createServer } from 'node:http';

const PORT = Number(process.argv[2] || 1314);
const FPS = { id: 'org-mcd-6bdda43a-029f-46fb-a67f-d655e6edc8ad', name: 'Family Preservation Services' };
const rec = (id, name, extra) => ({ id, kind: 'service', name, town: 'Ashburn', type_label: 'Outpatient', lat: 39.04, lng: -77.49, facets: {}, checked: {}, organizations: [], ...extra });
export const FIXTURES = [
  rec('s1', 'Ashburn Clinic', { organizations: [FPS] }),
  rec('s2', 'Roanoke Valley Counseling', { town: 'Roanoke', lat: 37.27, lng: -79.94, organizations: [FPS] }),
  rec('s3', 'Brightview Treatment', { town: 'Richmond', lat: 37.54, lng: -77.44, organizations: [{ id: 'org-mcd-stub-brightview', name: 'Brightview Health' }] }),
  rec('res-1', 'Atlantic House', { kind: 'residence', type_label: 'Recovery housing', operator: 'Atlantic Outreach Group', town: 'Norfolk', lat: 36.85, lng: -76.29, organizations: [{ id: 'org-op-stub-atlantic', name: 'Atlantic Outreach Group' }] }),
  rec('res-2', 'Harbor Home', { kind: 'residence', type_label: 'Recovery housing', operator: 'Harbor Recovery', town: 'Hampton', lat: 37.03, lng: -76.35, organizations: [{ id: 'org-op-stub-harbor', name: 'Harbor Recovery' }] }),
];

export function search(params) {
  const q = (params.get('q') || '').trim().toLowerCase();
  const domain = params.get('domain') || '';
  let rows = FIXTURES;
  if (domain === 'recovery_housing') rows = rows.filter((r) => r.kind === 'residence');
  if (q) rows = rows.filter((r) => [r.name, r.operator || '', r.town].some((s) => s.toLowerCase().includes(q)));
  const org = (params.get('org') || '').split(',').filter(Boolean);
  if (org.length) rows = rows.filter((r) => r.organizations.some((o) => org.includes(o.id)));
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
