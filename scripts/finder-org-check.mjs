// Headless check for the parent-organization link on the finder (tracker 290).
// Loads <base>/finder/?org=<id> in headless Firefox and asserts the "Listings of <name>" header
// with a Clear button and at least two result rows, each carrying an organization button;
// then clicks a row's organization button and asserts the URL carries org=<its id>, and that
// Clear removes org from the URL and the header. Needs the search service to know `org`.
// Needs geckodriver on GECKO (default http://127.0.0.1:4444):
//   geckodriver --port 4444 & node scripts/finder-org-check.mjs
// FINDER_BASE_URL: site root to test (default the dev landing site). The finder's API allows
// only the dev site and http://127.0.0.1:1313, so a local run is `make finder-preview`-style on :1313.
const GECKO = process.env.GECKO || 'http://127.0.0.1:4444';
const BASE = (process.env.FINDER_BASE_URL || 'https://landing.jhax.dev').replace(/\/+$/, '');
const ORG = process.env.FINDER_ORG_ID || 'org-mcd-6bdda43a-029f-46fb-a67f-d655e6edc8ad';
const NAME = process.env.FINDER_ORG_NAME || 'Family Preservation Services';

async function wd(method, path, body) {
  const r = await fetch(GECKO + path, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json();
  if (j.value && j.value.error) throw new Error(j.value.error + ': ' + j.value.message);
  return j.value;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PROBE = `return {
  url: location.search,
  header: (document.querySelector('.finder-orgbar') && !document.querySelector('.finder-orgbar').hidden) ? document.querySelector('.finder-orgbar').textContent : '',
  clear: !!document.querySelector('.finder-orgbar:not([hidden]) .finder-orgbar-clear'),
  rows: document.querySelectorAll('#finder-full .finder-item').length,
  orgButtons: Array.from(document.querySelectorAll('#finder-full .finder-item > button.finder-org')).map(function (b) { return { id: b.getAttribute('data-org'), text: b.textContent }; })
};`;
const probe = async (sid) => wd('POST', `/session/${sid}/execute/sync`, { script: PROBE, args: [] });
const until = async (sid, ok) => { let r; for (let i = 0; i < 30; i++) { await sleep(500); r = await probe(sid); if (ok(r)) break; } return r; };

let failed = false;
const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) failed = true; };
const sid = (await wd('POST', '/session', { capabilities: { alwaysMatch: { browserName: 'firefox', 'moz:firefoxOptions': { args: ['-headless'] } } } })).sessionId;
try {
  await wd('POST', `/session/${sid}/window/rect`, { width: 1400, height: 900 });
  await wd('POST', `/session/${sid}/url`, { url: `${BASE}/finder/?org=${ORG}` });
  let res = await until(sid, (r) => r.rows >= 2 && r.header);
  check(res.header.startsWith('Listings of ' + NAME), `header reads "Listings of ${NAME}" (got "${res.header}")`);
  check(res.clear, 'header has a Clear button');
  check(res.rows >= 2, `${res.rows} rows rendered (need >= 2)`);
  check(res.orgButtons.length >= 2 && res.orgButtons.every((b) => b.id === ORG && b.text.includes(NAME)), 'every row has an organization button for this organization');

  // Click an organization button from a plain search: org lands in the URL.
  await wd('POST', `/session/${sid}/url`, { url: `${BASE}/finder/?q=a` });
  res = await until(sid, (r) => r.orgButtons.length > 0);
  check(res.orgButtons.length > 0, 'a plain search shows organization buttons on rows');
  if (res.orgButtons.length) {
    const want = res.orgButtons[0].id;
    const btn = Object.values(await wd('POST', `/session/${sid}/element`, { using: 'css selector', value: '#finder-full .finder-item > button.finder-org' }))[0];
    await wd('POST', `/session/${sid}/execute/sync`, { script: 'arguments[0].scrollIntoView({block:"center"});', args: [{ 'element-6066-11e4-a52e-4f735466cecf': btn }] });
    await wd('POST', `/session/${sid}/element/${btn}/click`, {});
    res = await until(sid, (r) => r.url.includes('org='));
    check(new URLSearchParams(res.url).get('org') === want, `clicking the button sets org=${want} (URL ${res.url})`);
    check(res.header.startsWith('Listings of '), 'header shows after the click');
    const x = Object.values(await wd('POST', `/session/${sid}/element`, { using: 'css selector', value: '.finder-orgbar-clear' }))[0];
    await wd('POST', `/session/${sid}/element/${x}/click`, {});
    res = await until(sid, (r) => !r.url.includes('org='));
    check(!res.url.includes('org=') && res.header === '', 'Clear removes org from the URL and hides the header');
  }
} finally { await wd('DELETE', `/session/${sid}`).catch(() => {}); }
console.log(failed ? 'RESULT FAIL' : 'RESULT PASS');
process.exit(failed ? 1 : 0);
