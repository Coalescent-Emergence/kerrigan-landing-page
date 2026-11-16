// Headless check for the type-of-care choices (tracker 291).
// Builds the site against a local stub search API, loads the finder in headless Firefox and records
// the `domain` the page sends. Asserts: a Crisis care radio exists and sends `crisis` (strip shown);
// "Any" sends all four types, recovery housing included (strip hidden).
// Needs geckodriver on GECKO (default http://127.0.0.1:4444) and hugo on PATH:
//   geckodriver --port 4444 & node scripts/finder-domain-check.mjs
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const GECKO = process.env.GECKO || 'http://127.0.0.1:4444';
const repo = join(fileURLToPath(import.meta.url), '..', '..');
const tmp = mkdtempSync(join(tmpdir(), 'finder-domain-'));
const PORT = 18291;
const BASE = `http://127.0.0.1:${PORT}`;
const ALL = 'addiction,mental_health,crisis,recovery_housing';
writeFileSync(join(tmp, 'o.toml'), `[params]\n  finderEnabled = true\n  finderApiBase = "${BASE}/api"\n  kerrApiBase = "${BASE}/kerr"\n`);
execFileSync('hugo', ['--config', 'hugo.toml,' + join(tmp, 'o.toml'), '--destination', join(tmp, 'public'), '--baseURL', BASE + '/', '--quiet'], { cwd: repo, stdio: 'inherit' });

const seen = []; // the `domain` of each search request, in order
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const srv = createServer((req, res) => {
  const u = new URL(req.url, BASE);
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (u.pathname === '/api/v1/search') { seen.push(u.searchParams.get('domain')); res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ total: 0, results: [] })); return; }
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
const sid = (await wd('POST', '/session', { capabilities: { alwaysMatch: { browserName: 'firefox', 'moz:firefoxOptions': { args: ['-headless'] } } } })).sessionId;
const js = (script) => wd('POST', `/session/${sid}/execute/sync`, { script, args: [] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = false;
const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) failed = true; };
// Click a type-of-care radio, wait for the search it triggers, return its domain and the strip state.
async function choose(value) {
  const before = seen.length;
  await js(`const r = document.querySelector('input[name=domain][value="${value}"]'); if (r) r.click(); return 1;`);
  for (let i = 0; i < 30 && seen.length === before; i++) await sleep(300);
  await sleep(300);
  return { sent: seen[seen.length - 1], searched: seen.length > before, strip: await js(`return document.getElementById('finder-crisis').hidden ? 'hidden' : 'shown';`) };
}
try {
  await wd('POST', `/session/${sid}/window/rect`, { width: 1400, height: 900 });
  await wd('POST', `/session/${sid}/url`, { url: BASE + '/finder/?q=atlantic' });
  for (let i = 0; i < 30 && !seen.length; i++) await sleep(300);
  check(seen[0] === ALL, `Any (initial search) sends ${ALL}; got ${seen[0]}`);
  check(await js(`return document.querySelectorAll('input[name=domain][value=crisis]').length;`) === 1, 'one Crisis care radio exists');
  check(await js(`const r = document.querySelector('input[name=domain][value=crisis]'); return r ? r.closest('label').textContent.trim() : null;`) === 'Crisis care', 'the radio is labelled "Crisis care"');
  const crisis = await choose('crisis');
  check(crisis.sent === 'crisis', `Crisis care sends domain=crisis; got ${crisis.sent}`);
  check(crisis.strip === 'shown', `crisis strip ${crisis.strip} for Crisis care`);
  const any = await choose('');
  check(any.sent === ALL, `Any sends ${ALL}; got ${any.sent}`);
  check(any.strip === 'hidden', `crisis strip ${any.strip} for Any`);
  // Reset returns the form to Any: it must send the same four types, not no type, and hide the strip.
  await choose('crisis');
  const before = seen.length;
  await js(`document.getElementById('finder-form').reset(); return 1;`);
  for (let i = 0; i < 30 && seen.length === before; i++) await sleep(300);
  await sleep(2000); // Reset fires a direct search and a live search; every one must carry all four types
  const after = seen.slice(before);
  check(after.length > 0 && after.every((d) => d === ALL), `every search after Reset sends ${ALL}; got ${JSON.stringify(after)}`);
  check(await js(`return document.getElementById('finder-crisis').hidden ? 'hidden' : 'shown';`) === 'hidden', 'crisis strip hidden after Reset');
} finally { await wd('DELETE', `/session/${sid}`).catch(() => {}); srv.close(); }
console.log(failed ? 'RESULT FAIL' : 'RESULT PASS');
process.exit(failed ? 1 : 0);
