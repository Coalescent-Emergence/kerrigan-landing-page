// Browser check: on the finder page the map-style buttons (.finder-basemaps button) and the
// "Search this map area" button (#finder-area) lie fully inside the window and are the topmost
// element at their centre, at desktop, tablet and phone sizes. Desktop is judged without scrolling
// the page; tablet and phone after scrollIntoView of .finder-mapwrap (the map sits below the
// search form there). Phone: Firefox will not make a window narrower than ~500px, so 390x844 is
// requested and the real innerWidth is printed. One desktop case un-hides #finder-crisis.
// Needs geckodriver on GECKO (default http://127.0.0.1:4444) and the page URL as argv[2]:
//   geckodriver --port 4444 & node scripts/finder-controls-check.mjs http://127.0.0.1:1313/finder/
const GECKO = process.env.GECKO || 'http://127.0.0.1:4444';
const url = process.argv[2];
if (!url) { console.error('usage: finder-controls-check.mjs <finder url>'); process.exit(2); }

async function wd(method, path, body) {
  const r = await fetch(GECKO + path, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json();
  if (j.value && j.value.error) throw new Error(j.value.error + ': ' + j.value.message);
  return j.value;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PROBE = `
  const [scroll, crisis, phone] = arguments;
  if (crisis) { const c = document.getElementById('finder-crisis'); if (c) c.hidden = false; }
  if (phone) { const t = document.querySelector('[data-view=map]'); if (t) t.click(); }
  const area = document.getElementById('finder-area');
  if (area) area.hidden = false;
  if (scroll) { const m = document.querySelector('.finder-mapwrap'); if (m) m.scrollIntoView({ block: 'start' }); }
  const W = window.innerWidth, H = window.innerHeight;
  const els = [...document.querySelectorAll('.finder-basemaps button')];
  if (area) els.push(area);
  const out = { W, H, scrollY: Math.round(window.scrollY), items: [] };
  for (const el of els) {
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    out.items.push({
      name: el.id ? '#' + el.id : 'basemap:' + el.textContent.trim().slice(0, 12),
      x: Math.round(r.x), y: Math.round(r.y), r: Math.round(r.right), b: Math.round(r.bottom),
      shown: r.width > 0 && r.height > 0,
      inside: r.width > 0 && r.left >= 0 && r.top >= 0 && r.right <= W && r.bottom <= H,
      top: !!hit && (hit === el || el.contains(hit)),
    });
  }
  return out;`;

const cases = [
  { name: 'desktop 1280x720', w: 1280, h: 720 },
  { name: 'desktop 1440x900', w: 1440, h: 900 },
  { name: 'desktop 1920x1080', w: 1920, h: 1080 },
  { name: 'desktop 1280x720 + crisis strip', w: 1280, h: 720, crisis: true },
  { name: 'tablet 900x800', w: 900, h: 800, scroll: true },
  { name: 'phone 390x844', w: 390, h: 844, scroll: true, phone: true },
];

const sess = await wd('POST', '/session', { capabilities: { alwaysMatch: { browserName: 'firefox', 'moz:firefoxOptions': { args: ['-headless'] } } } });
const sid = sess.sessionId;
let failed = false;
try {
  for (const c of cases) {
    await wd('POST', `/session/${sid}/window/rect`, { width: c.w, height: c.h });
    await wd('POST', `/session/${sid}/url`, { url });
    await sleep(4000);
    const res = await wd('POST', `/session/${sid}/execute/sync`, { script: PROBE, args: [!!c.scroll, !!c.crisis, !!c.phone] });
    const bad = [];
    if (!res.items.some((i) => i.name === '#finder-area')) bad.push('#finder-area missing');
    if (!res.items.some((i) => i.name.startsWith('basemap:'))) bad.push('no basemap buttons');
    for (const i of res.items) {
      if (!i.shown) bad.push(`${i.name} not rendered`);
      else if (!i.inside) bad.push(`${i.name} rect ${i.x},${i.y}..${i.r},${i.b} outside ${res.W}x${res.H}`);
      else if (!i.top) bad.push(`${i.name} covered at its centre`);
    }
    if (!c.scroll && res.scrollY !== 0) bad.push(`page scrolled to ${res.scrollY}`);
    if (bad.length) failed = true;
    console.log(`${bad.length ? 'FAIL' : 'PASS'} ${c.name} (innerWidth ${res.W}x${res.H}${c.scroll ? ', after scrollIntoView' : ''})${bad.length ? ': ' + bad.join('; ') : ''}`);
  }
} finally {
  await wd('DELETE', `/session/${sid}`).catch(() => {});
}
console.log(failed ? 'RESULT FAIL' : 'RESULT PASS');
process.exit(failed ? 1 : 0);
