// Headless check for the "Matched: <name>" line on finder result cards (tracker 287).
// Builds the site against a local stub search API, serves it, and loads the finder in headless
// Firefox with results that have matched_name as a string (with markup in it), null, and absent.
// Needs geckodriver on GECKO (default http://127.0.0.1:4444) and hugo on PATH:
//   geckodriver --port 4444 & node scripts/finder-matched-check.mjs
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const GECKO = process.env.GECKO || 'http://127.0.0.1:4444';
const repo = join(fileURLToPath(import.meta.url), '..', '..');
const tmp = mkdtempSync(join(tmpdir(), 'finder-matched-'));
const PORT = 18287;
const BASE = `http://127.0.0.1:${PORT}`;
writeFileSync(join(tmp, 'o.toml'), `[params]\n  finderEnabled = true\n  finderApiBase = "${BASE}/api"\n  kerrApiBase = "${BASE}/kerr"\n`);
execFileSync('hugo', ['--config', 'hugo.toml,' + join(tmp, 'o.toml'), '--destination', join(tmp, 'public'), '--baseURL', BASE + '/', '--quiet'], { cwd: repo, stdio: 'inherit' });

const XSS = '<img src=x onerror="window.__xss=1">Fresh Start';
const rec = (id, name, extra) => ({ id, kind: 'service', name, town: 'Ashburn', type_label: 'Outpatient', lat: 39.04, lng: -77.49, facets: {}, checked: {}, ...extra });
const DATA = {
  with: [rec('a', 'Ashburn Clinic', { matched_name: 'Insight Recovery Centers' }),
         rec('b', 'Atlantic House', { kind: 'residence', operator: 'Atlantic Outreach Group', matched_name: XSS })],
  without: [rec('a', 'Ashburn Clinic', { matched_name: null }), rec('b', 'Atlantic House', { kind: 'residence', operator: 'Atlantic Outreach Group' })],
};
let mode = 'with';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const srv = createServer((req, res) => {
  const u = new URL(req.url, BASE);
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (u.pathname === '/__mode') { mode = u.searchParams.get('m'); res.end('ok'); return; }
  if (u.pathname === '/api/v1/search') { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ total: DATA[mode].length, results: DATA[mode] })); return; }
  if (u.pathname.startsWith('/api/') || u.pathname.startsWith('/kerr/')) { res.setHeader('content-type', 'application/json'); res.end('{}'); return; }
  let p = join(tmp, 'public', decodeURIComponent(u.pathname));
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
  if (!existsSync(p)) { res.statusCode = 404; res.end(); return; }
  res.setHeader('content-type', MIME[extname(p)] || 'application/octet-stream'); res.end(readFileSync(p));
}).listen(PORT, '127.0.0.1');

async function wd(method, path, body) {
  const r = await fetch(GECKO + path, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json();
  if (j.value && j.value.error) throw new Error(j.value.error + ': ' + j.value.message);
  return j.value;
}
const PROBE = `return { xss: window.__xss === 1, cards: Array.from(document.querySelectorAll('.finder-item')).map(li => ({
  id: li.getAttribute('data-id'), matched: Array.from(li.querySelectorAll('.finder-row .finder-row-matched')).map(n => n.textContent),
  row: li.querySelector('.finder-row').innerHTML })) };`;
const sid = (await wd('POST', '/session', { capabilities: { alwaysMatch: { browserName: 'firefox', 'moz:firefoxOptions': { args: ['-headless'] } } } })).sessionId;
let failed = false;
const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) failed = true; };
const rows = {};
try {
  for (const m of ['with', 'without']) {
    await fetch(`${BASE}/__mode?m=${m}`);
    await wd('POST', `/session/${sid}/window/rect`, { width: 1400, height: 900 });
    await wd('POST', `/session/${sid}/url`, { url: BASE + '/finder/?q=x' });
    let res;
    for (let i = 0; i < 30; i++) { await new Promise((r) => setTimeout(r, 500)); res = await wd('POST', `/session/${sid}/execute/sync`, { script: PROBE, args: [] }); if (res.cards.length >= 2) break; }
    check(res.cards.length >= 2, `${m}: ${res.cards.length} cards rendered`);
    rows[m] = Object.fromEntries(res.cards.map((c) => [c.id, c]));
    if (m === 'with') {
      check(JSON.stringify(rows.with.a.matched) === JSON.stringify(['Matched: Insight Recovery Centers']), 'service card shows "Matched: Insight Recovery Centers"');
      check(rows.with.b.matched.length === 1 && rows.with.b.matched[0] === 'Matched: ' + XSS, 'residence card shows the markup string as literal text');
      check(!res.xss, 'no HTML injected (onerror did not run)');
    } else {
      check(rows.without.a.matched.length === 0 && rows.without.b.matched.length === 0, 'null/absent: no matched line');
      const strip = (h) => h.replace(/<span class="finder-row-matched">.*?<\/span>/, '');
      check(!rows.without.a.row.includes('finder-row-matched') && !rows.without.b.row.includes('finder-row-matched'), 'null/absent rows contain no finder-row-matched element');
      check(strip(rows.with.a.row) === rows.without.a.row, 'service row with the line removed is identical to the null row');
    }
  }
} finally { await wd('DELETE', `/session/${sid}`).catch(() => {}); srv.close(); }
console.log(failed ? 'RESULT FAIL' : 'RESULT PASS');
process.exit(failed ? 1 : 0);
