// Headless check for the client-home pin (tracker 250). Builds the site with finderTransit on against a
// local stub of the finder API, serves it, loads the finder in headless Firefox, arms the pin, clicks the
// map, and records every request the page makes:
//   - exactly one request carries the pin, it is POST {api}/v1/travel, and its body is {lat,lng,ids}
//     with service ids only (the residence card is not sent);
//   - no URL the page fetched (search, crisis, map tiles, scripts) contains the coordinates;
//   - the cards show "About N min by transit" and "N km straight line · Plan the trip with <agency>".
// Needs geckodriver on GECKO (default http://127.0.0.1:4444) and hugo on PATH:
//   geckodriver --port 4444 & node scripts/finder-transit-check.mjs
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const GECKO = process.env.GECKO || 'http://127.0.0.1:4444';
const repo = join(fileURLToPath(import.meta.url), '..', '..');
const PORT = 18250;
const BASE = `http://127.0.0.1:${PORT}`;
let srv = null;
const log = []; // requests the stub saw
{
  const tmp = mkdtempSync(join(tmpdir(), 'finder-transit-'));
  writeFileSync(join(tmp, 'o.toml'), `[params]\n  finderEnabled = true\n  finderTransit = true\n  finderApiBase = "${BASE}/api"\n  kerrApiBase = "${BASE}/kerr"\n`);
  execFileSync('hugo', ['--config', 'hugo.toml,' + join(tmp, 'o.toml'), '--destination', join(tmp, 'public'), '--baseURL', BASE + '/', '--quiet'], { cwd: repo, stdio: 'inherit' });
  const rec = (id, name, extra) => ({ id, kind: 'service', name, town: 'Richmond', type_label: 'Outpatient', lat: 37.54, lng: -77.43, facets: {}, checked: {}, ...extra });
  const RESULTS = [rec('svc-1', 'Richmond Clinic'), rec('svc-2', 'Far Clinic'), rec('res-3', 'Oak House', { kind: 'residence' })];
  const TRAVEL = [{ id: 'svc-1', minutes: 34 }, { id: 'svc-2', minutes: null, distance_km: 12.4, agency: { name: 'GRTC', url: 'https://ridegrtc.com/' } }];
  const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
  srv = createServer((req, res) => {
    const u = new URL(req.url, BASE);
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      if (u.pathname.startsWith('/api/') || u.pathname.startsWith('/kerr/')) log.push({ method: req.method, url: req.url, body });
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'content-type, accept, authorization');
      if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
      if (u.pathname === '/api/v1/search') { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ total: RESULTS.length, results: RESULTS })); return; }
      if (u.pathname === '/api/v1/travel') { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(TRAVEL)); return; }
      if (u.pathname.startsWith('/api/') || u.pathname.startsWith('/kerr/')) { res.setHeader('content-type', 'application/json'); res.end('{}'); return; }
      let p = join(tmp, 'public', decodeURIComponent(u.pathname));
      if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
      if (!existsSync(p)) { res.statusCode = 404; res.end(); return; }
      res.setHeader('content-type', MIME[extname(p)] || 'application/octet-stream'); res.end(readFileSync(p));
    });
  }).listen(PORT, '127.0.0.1');
}

async function wd(method, path, body) {
  const r = await fetch(GECKO + path, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json();
  if (j.value && j.value.error) throw new Error(j.value.error + ': ' + j.value.message);
  return j.value;
}
const sid = (await wd('POST', '/session', { capabilities: { alwaysMatch: { browserName: 'firefox', 'moz:firefoxOptions': { args: ['-headless'] } } } })).sessionId;
const run = (script, args = []) => wd('POST', `/session/${sid}/execute/sync`, { script, args });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = false;
const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) failed = true; };
try {
  await wd('POST', `/session/${sid}/window/rect`, { width: 1400, height: 900 });
  await wd('POST', `/session/${sid}/url`, { url: BASE + '/finder/?q=richmond' });
  for (let i = 0; i < 40; i++) { await sleep(500); if ((await run(`return document.querySelectorAll('.finder-item').length`)) >= 3) break; }
  const before = await run(`return performance.getEntriesByType('resource').length`);
  log.length = 0;

  await run(`document.getElementById('finder-pin-btn').click()`);
  const rect = await run(`var r = document.getElementById('finder-map').getBoundingClientRect(); return [r.left, r.top, r.width, r.height]`);
  // A point in the map's lower-left quarter, clear of the controls and the results drawer's pins.
  const x = Math.round(rect[0] + rect[2] * 0.7), y = Math.round(rect[1] + rect[3] * 0.7);
  await wd('POST', `/session/${sid}/actions`, { actions: [{ type: 'pointer', id: 'm', parameters: { pointerType: 'mouse' }, actions: [
    { type: 'pointerMove', duration: 0, x, y }, { type: 'pointerDown', button: 0 }, { type: 'pointerUp', button: 0 }] }] });
  for (let i = 0; i < 20; i++) { await sleep(500); if (await run(`return document.querySelectorAll('.finder-travel').length`)) break; }
  await sleep(1000);

  check(await run(`return !!document.querySelector('.maplibregl-marker')`), 'a pin marker is on the map');
  const urls = await run(`return performance.getEntriesByType('resource').slice(arguments[0]).map(function (e) { return e.name; })`, [before]);
  {
    const travel = log.filter((r) => r.url.indexOf('/v1/travel') !== -1 && r.method === 'POST');
    check(travel.length === 1, `exactly one POST to /api/v1/travel after the pin (saw ${travel.length})`);
    const b = travel[0] ? JSON.parse(travel[0].body) : {};
    check(b.lat > 36 && b.lat < 40 && b.lng > -84 && b.lng < -75, `body carries lat ${b.lat} and lng ${b.lng}`);
    check(JSON.stringify(Object.keys(b).sort()) === '["ids","lat","lng"]', 'body has lat, lng, ids and nothing else');
    check(JSON.stringify(b.ids) === '["svc-1","svc-2"]', `ids are the service cards only: ${JSON.stringify(b.ids)}`);
    const others = log.filter((r) => r.url.indexOf('/v1/travel') === -1);
    check(others.every((r) => !(String(b.lat) && (r.url + r.body).indexOf(String(b.lat).slice(0, 7)) !== -1)), `no other stub request (${others.length}) carries the pin`);
    check(others.length === 0, `no other API request after the pin (saw ${others.map((r) => r.method + ' ' + r.url).join(', ') || 'none'})`);
    const t = await run(`return Array.from(document.querySelectorAll('.finder-item')).map(function (li) { var p = li.querySelector('.finder-travel'); var a = p && p.querySelector('a'); return { id: li.getAttribute('data-id'), text: p ? p.textContent : null, href: a ? a.href : null, rel: a ? a.rel : null }; })`);
    const by = Object.fromEntries(t.map((c) => [c.id, c]));
    check(by['svc-1'] && by['svc-1'].text === 'About 34 min by transit', `svc-1: ${by['svc-1'] && by['svc-1'].text}`);
    check(by['svc-2'] && by['svc-2'].text === '12 km straight line · Plan the trip with GRTC' && by['svc-2'].href === 'https://ridegrtc.com/', `svc-2: ${by['svc-2'] && by['svc-2'].text} -> ${by['svc-2'] && by['svc-2'].href}`);
    check(by['res-3'] && by['res-3'].text === null, 'residence card has no travel line');
    const pos = b.lat !== undefined ? [String(b.lat).slice(0, 7), String(b.lng).slice(0, 7)] : null;
    check(pos && urls.every((u) => u.indexOf(pos[0]) === -1 && u.indexOf(pos[1]) === -1), `none of ${urls.length} browser-fetched URLs carries the pin`);
    console.log('network log (stub API, after the pin):'); log.forEach((r) => console.log('  ' + r.method + ' ' + r.url + (r.body ? ' ' + r.body : '')));
  }
  if (!failed) console.log('only /api/v1/travel carried the pin');
} finally { await wd('DELETE', `/session/${sid}`).catch(() => {}); if (srv) srv.close(); }
console.log(failed ? 'RESULT FAIL' : 'RESULT PASS');
process.exit(failed ? 1 : 0);
