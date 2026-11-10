// Browser check: on the finder page every site-nav link is visible and is the topmost
// element at its centre (not covered by the map or search bar), at desktop and phone
// widths, and the phone page does not scroll sideways.
// Needs geckodriver on GECKO (default http://127.0.0.1:4444) and the page URL as argv[2]:
//   geckodriver --port 4444 & node scripts/finder-nav-check.mjs http://127.0.0.1:1313/finder/ [shotPrefix]
import { writeFileSync } from 'node:fs';

const GECKO = process.env.GECKO || 'http://127.0.0.1:4444';
const url = process.argv[2];
const shots = process.argv[3];
if (!url) { console.error('usage: finder-nav-check.mjs <finder url> [screenshot prefix]'); process.exit(2); }

async function wd(method, path, body) {
  const r = await fetch(GECKO + path, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json();
  if (j.value && j.value.error) throw new Error(j.value.error + ': ' + j.value.message);
  return j.value;
}

const PROBE = `
  const doc = arguments[0] || document;
  const out = { links: [], scrollX: doc.documentElement.scrollWidth - doc.documentElement.clientWidth };
  const sels = ['.site-nav a.nav-link', '.site-nav a.btn', '.site-nav .logo, .site-nav a[href="/"]'];
  const seen = new Set();
  for (const el of doc.querySelectorAll(sels.join(','))) {
    if (seen.has(el)) continue; seen.add(el);
    const r = el.getBoundingClientRect();
    const cs = doc.defaultView.getComputedStyle(el);
    const shown = r.width > 0 && r.height > 0 && cs.visibility !== 'hidden';
    let top = null, ok = false;
    if (shown) {
      const top_ = doc.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      top = top_ ? (top_.tagName + (top_.id ? '#' + top_.id : '') + '.' + String(top_.className).slice(0, 30)) : null;
      ok = !!top_ && (top_ === el || el.contains(top_));
    }
    out.links.push({ text: el.textContent.trim().slice(0, 30), href: el.getAttribute('href'), current: el.getAttribute('aria-current'), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), shown, topmost: top, ok });
  }
  return out;`;

const sess = await wd('POST', '/session', { capabilities: { alwaysMatch: { browserName: 'firefox', 'moz:firefoxOptions': { args: ['-headless'] } } } });
const sid = sess.sessionId;
let failed = false;
try {
  for (const [name, w, h] of [['desktop', 1400, 900], ['phone', 375, 800]]) {
    await wd('POST', `/session/${sid}/window/rect`, { width: w, height: h });
    await wd('POST', `/session/${sid}/url`, { url });
    await new Promise((r) => setTimeout(r, 4000));
    // Firefox headless will not make the window narrower than ~500px, so the phone width is a
    // same-origin 375px iframe of the same page, probed through its own document.
    const script = name === 'phone'
      ? `const done = arguments[arguments.length - 1]; document.body.innerHTML = ''; const f = document.createElement('iframe');
         f.src = location.href; f.style.cssText = 'width:${w}px;height:${h}px;border:0'; document.body.append(f);
         f.onload = () => setTimeout(() => { const probe = new Function(${JSON.stringify(PROBE)}); done(probe.call(null, f.contentDocument)); }, 3000);`
      : `const probe = new Function(${JSON.stringify(PROBE)}); return probe.call(null, document);`;
    const res = await wd('POST', `/session/${sid}/execute/${name === 'phone' ? 'async' : 'sync'}`, { script, args: [] });
    console.log(name, JSON.stringify(res, null, 1));
    const want = ['/', '/articles/', '/finder/'];
    // The page's own pill carries aria-current=page (finder on /finder/, Articles on /articles/);
    // Pricing is an anchor and never current. Set CURRENT=/finder/ or /articles/ to assert it.
    const cur = process.env.CURRENT;
    if (cur) {
      for (const l of res.links) {
        const should = l.href === cur;
        if ((l.current === 'page') !== should) { failed = true; console.log(`FAIL ${name}: ${l.href} aria-current=${l.current}, expected ${should ? 'page' : 'none'}`); }
      }
    }
    for (const href of want) {
      const l = res.links.find((x) => x.href === href);
      if (!l || !l.shown || !l.ok) { failed = true; console.log(`FAIL ${name}: nav link ${href} missing, hidden or covered`); }
    }
    if (name === 'phone' && res.scrollX > 0) { failed = true; console.log('FAIL phone: page scrolls sideways by', res.scrollX); }
    if (shots) {
      const png = await wd('GET', `/session/${sid}/screenshot`);
      writeFileSync(`${shots}-${name}.png`, Buffer.from(png, 'base64'));
    }
  }
} finally {
  await wd('DELETE', `/session/${sid}`).catch(() => {});
}
console.log(failed ? 'RESULT FAIL' : 'RESULT PASS');
process.exit(failed ? 1 : 0);
