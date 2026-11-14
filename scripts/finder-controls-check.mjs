// Browser check: on the finder page the map-style buttons (.finder-basemaps button) and the
// "Search this map area" button (#finder-area) lie fully inside the window and are the topmost
// element at their centre, at desktop, tablet and phone sizes. Desktop is judged without scrolling
// the page; tablet and phone after scrollIntoView of .finder-mapwrap (the map sits below the
// search form there); there it also asserts #finder-area sits in the upper third of #finder-map.
// Desktop also asserts .finder-signup is inside the window and that neither the document nor
// body has anything left to scroll. Each line prints the crisis strip's state (forced or as loaded).
// Phone: Firefox will not make a window narrower than ~500px, so 390x844 is
// requested and the real innerWidth is printed. Desktop 1280x720 runs twice, with #finder-crisis forced hidden and forced shown.
// Hover: at 1440x900 and the phone case a WebDriver pointer is moved onto the centre of #finder-area;
// its rect must be unchanged (within 0.5px) 400ms later, and its ::after shimmer must be animating
// (computed animation-name not none). The button used to slide right under the pointer because
// the design system's hover transform replaced the centring transform.
// Clear buttons: at 1440x900 and the phone case, text is typed into the program-name and town boxes
// (real key events); each box's clear button (aria-label "Clear program name" / "Clear town") must
// then be visible and inside the window, and a click must empty that box only, leave focus in it
// and hide the button again.
// Every case also asserts the Type of care group holds an input with value recovery_housing.
// House search: with Recovery housing selected and "atlantic" typed into the program-name box (Enter),
// at least one result card must render containing "Atlantic Outreach Group", and the privacy note
// (#finder-house-note) must be visible; the note must be hidden again for Any type of care.
// Live search: with no Enter, a type-of-care click and typed names change the results, an older delayed answer never overwrites a newer one,
// focus stays in the box, #finder-status is aria-live polite, and Enter still searches.
// Tablet (800x1000, 900x800, 1000x700) and desktop (incl. 1280x600) also assert the search bar controls (name box, town box,
// Filters, Search), and that the results list and the map end inside the window with nothing left to scroll; desktop 1440x900
// closes the results panel and asserts the Results toggle is still on screen and clickable.
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
const find0 = async (css) => Object.values(await wd('POST', `/session/${sid}/element`, { using: 'css selector', value: css }))[0];

const PROBE = `
  const [scroll, crisis, phone, fit, desk] = arguments;
  const cEl = document.getElementById('finder-crisis');
  if (cEl && crisis === 'show') cEl.hidden = false;
  if (cEl && crisis === 'hide') cEl.hidden = true;
  if (phone) { const t = document.querySelector('[data-view=map]'); if (t) t.click(); }
  const area = document.getElementById('finder-area');
  if (area) area.hidden = false;
  if (scroll) { const m = document.querySelector('.finder-mapwrap'); if (m) m.scrollIntoView({ block: 'start' }); }
  const W = window.innerWidth, H = window.innerHeight;
  const els = [...document.querySelectorAll('.finder-basemaps button')];
  if (area) els.push(area);
  const named = new Map();
  if (fit) {
    // Search bar controls (name box, town box, Filters, Search) are on screen without scrolling at desktop and tablet.
    for (const [n, css] of [['bar:name', '.finder-filters input[name=q]'], ['bar:town', '.finder-filters input[name=town]'], ['bar:filters', '#finder-drawer-open'], ['bar:search', '.finder-filters .f-bar-actions button[type=submit]']]) {
      const e = document.querySelector(css); if (e) { named.set(e, n); } else { named.set({ missing: n }, n); }
    }
  }
  if (desk) { const t = document.getElementById('finder-results-toggle'); named.set(t || { missing: 'results-toggle' }, 'results-toggle'); }
  const missing = [];
  for (const [e, n] of named) { if (e.missing) missing.push(n); else els.push(e); }
  const nameOf = (el) => named.get(el) || (el.id ? '#' + el.id : 'basemap:' + el.textContent.trim().slice(0, 12));
  // Results list and map must end inside the window (tablet and desktop).
  const boxes = [];
  if (fit) for (const [n, e] of [['list', document.getElementById('finder-list')], ['map', document.getElementById('finder-map')]]) {
    const r = e.getBoundingClientRect();
    boxes.push({ name: n, y: Math.round(r.y), b: Math.round(r.bottom), x: Math.round(r.x), r: Math.round(r.right), inside: r.width > 0 && r.left >= 0 && r.top >= 0 && r.right <= W && r.bottom <= H });
  }
  const de = document.documentElement, bo = document.body;
  const sg = document.querySelector('.finder-signup'), sr = sg && sg.getBoundingClientRect();
  const map = document.getElementById('finder-map').getBoundingClientRect();
  const ar = area && area.getBoundingClientRect();
  const cs = cEl && getComputedStyle(cEl), crect = cEl && cEl.getBoundingClientRect();
  const out = { W, H, crisisBox: cEl ? { display: cs.display, h: Math.round(crect.height) } : null, wide: { body: document.body.scrollWidth, doc: de.scrollWidth, widest: [...document.querySelectorAll('body *')].filter((e) => e.getBoundingClientRect().right > W + 0.5 && e.getBoundingClientRect().width > 0).slice(0, 4).map((e) => (e.tagName + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).join('.') : '') + ' right ' + Math.round(e.getBoundingClientRect().right))) }, missing, boxes, scrollY: Math.round(window.scrollY), items: [],
    crisis: !cEl ? 'absent' : cEl.hidden ? 'hidden' : 'shown',
    maxScroll: { doc: de.scrollHeight - de.clientHeight, body: bo.scrollHeight - bo.clientHeight },
    signup: sr ? { y: Math.round(sr.y), b: Math.round(sr.bottom), inside: sr.top >= 0 && sr.bottom <= H && sr.left >= 0 && sr.right <= W } : null,
    anchor: ar ? { inMap: ar.left >= map.left && ar.right <= map.right && ar.top >= map.top && ar.bottom <= map.bottom, upperThird: ar.top - map.top <= map.height / 3, top: Math.round(ar.top - map.top), mapH: Math.round(map.height) } : null };
  for (const el of els) {
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    out.items.push({
      name: nameOf(el),
      x: Math.round(r.x), y: Math.round(r.y), r: Math.round(r.right), b: Math.round(r.bottom),
      shown: r.width > 0 && r.height > 0,
      inside: r.width > 0 && r.left >= 0 && r.top >= 0 && r.right <= W && r.bottom <= H,
      top: !!hit && (hit === el || el.contains(hit)),
    });
  }
  return out;`;

const cases = [
  { name: 'desktop 1280x720', w: 1280, h: 720, desktop: true },
  { name: 'desktop 1280x720', w: 1280, h: 720, desktop: true, crisis: 'hide' },
  { name: 'desktop 1280x720', w: 1280, h: 720, desktop: true, crisis: 'show' },
  { name: 'desktop 1280x600', w: 1280, h: 600, desktop: true, crisis: 'hide' },
  { name: 'desktop 1280x600', w: 1280, h: 600, desktop: true, crisis: 'show' },
  { name: 'desktop 1440x900', w: 1440, h: 900, desktop: true, hover: true, clear: true, toggle: true },
  { name: 'desktop 1920x1080', w: 1920, h: 1080, desktop: true },
  { name: 'tablet 800x1000', w: 800, h: 1000, tablet: true },
  { name: 'tablet 900x800', w: 900, h: 800, tablet: true },
  { name: 'tablet 1000x700', w: 1000, h: 700, tablet: true },
  { name: 'phone 390x844', w: 390, h: 844, scroll: true, phone: true, crisis: 'hide' },
  { name: 'phone 390x844', w: 390, h: 844, scroll: true, phone: true, crisis: 'show' },
  { name: 'narrow 500x844', w: 500, h: 844, scroll: true, phone: true },
  { name: 'phone 390x844', w: 390, h: 844, scroll: true, phone: true, hover: true, clear: true },
];

const sess = await wd('POST', '/session', { capabilities: { alwaysMatch: { browserName: 'firefox', 'moz:firefoxOptions': { args: ['-headless'] } } } });
const sid = sess.sessionId;
let failed = false;
try {
  for (const c of cases) {
    await wd('POST', `/session/${sid}/window/rect`, { width: c.w, height: c.h });
    await wd('POST', `/session/${sid}/url`, { url });
    await sleep(4000);
    const res = await wd('POST', `/session/${sid}/execute/sync`, { script: PROBE, args: [!!c.scroll, c.crisis || null, !!c.phone, !!(c.desktop || c.tablet), !!c.desktop] });
    const bad = [];
    if (!res.items.some((i) => i.name === '#finder-area')) bad.push('#finder-area missing');
    if (!res.items.some((i) => i.name.startsWith('basemap:'))) bad.push('no basemap buttons');
    for (const i of res.items) {
      if (!i.shown) bad.push(`${i.name} not rendered`);
      else if (!i.inside) bad.push(`${i.name} rect ${i.x},${i.y}..${i.r},${i.b} outside ${res.W}x${res.H}`);
      else if (!i.top) bad.push(`${i.name} covered at its centre`);
    }
    const hasHousing = await wd('POST', `/session/${sid}/execute/sync`, { script: `return !!document.querySelector('[aria-label="Type of care"] input[value="recovery_housing"]');`, args: [] });
    if (!hasHousing) bad.push('Type of care has no recovery_housing input');
    if (res.wide.body > res.W || res.wide.doc > res.W) bad.push(`sideways overflow: body.scrollWidth ${res.wide.body}, documentElement.scrollWidth ${res.wide.doc}, window ${res.W} (${res.wide.widest.join('; ')})`);
    if (c.crisis && !res.crisisBox) bad.push('#finder-crisis missing');
    else if (c.crisis === 'hide' && (res.crisisBox.display !== 'none' || res.crisisBox.h !== 0)) bad.push(`crisis strip hidden but display ${res.crisisBox.display}, height ${res.crisisBox.h}`);
    else if (c.crisis === 'show' && (res.crisisBox.display === 'none' || res.crisisBox.h <= 0)) bad.push(`crisis strip shown but display ${res.crisisBox.display}, height ${res.crisisBox.h}`);
    for (const m of res.missing) bad.push(`${m} missing`);
    for (const b of res.boxes) if (!b.inside) bad.push(`${b.name} rect ${b.x},${b.y}..${b.r},${b.b} outside ${res.W}x${res.H}`);
    if (!c.scroll && res.scrollY !== 0) bad.push(`page scrolled to ${res.scrollY}`);
    if (c.desktop || c.tablet) {
      if (!res.signup) bad.push('.finder-signup missing');
      else if (!res.signup.inside) bad.push(`.finder-signup ${res.signup.y}..${res.signup.b} outside ${res.W}x${res.H}`);
      if (res.maxScroll.doc > 0 || res.maxScroll.body > 0) bad.push(`leftover scroll doc ${res.maxScroll.doc} body ${res.maxScroll.body}`);
    } else if (!res.anchor || !res.anchor.inMap || !res.anchor.upperThird) {
      bad.push(`#finder-area not in the upper third of #finder-map (${res.anchor ? `top ${res.anchor.top} of ${res.anchor.mapH}, inMap ${res.anchor.inMap}` : 'missing'})`);
    }
    if (c.toggle) {
      // Results closed: the toggle slides to the left edge and must still be on screen and clickable.
      const TG = `const t = document.getElementById('finder-results-toggle'); const r = t.getBoundingClientRect();
        const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return { x: Math.round(r.x), r: Math.round(r.right), y: Math.round(r.y), b: Math.round(r.bottom), open: document.querySelector('.finder-stage').dataset.results,
          inside: r.width > 0 && r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight, top: !!hit && (hit === t || t.contains(hit)) };`;
      const tgEl = await find0('#finder-results-toggle');
      await wd('POST', `/session/${sid}/element/${tgEl}/click`, {});
      await sleep(600);
      const tg = await wd('POST', `/session/${sid}/execute/sync`, { script: TG, args: [] });
      if (tg.open !== 'closed') bad.push(`results toggle click left data-results=${tg.open}`);
      else if (!tg.inside) bad.push(`results toggle (closed) rect ${tg.x},${tg.y}..${tg.r},${tg.b} outside the window`);
      else if (!tg.top) bad.push('results toggle (closed) covered at its centre');
      await wd('POST', `/session/${sid}/element/${tgEl}/click`, {});
      await sleep(400);
    }
    if (c.hover) {
      const RECT = `const a = document.getElementById('finder-area'); const r = a.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height, anim: getComputedStyle(a, '::after').animationName, reduced: matchMedia('(prefers-reduced-motion: reduce)').matches };`;
      const move = (x, y) => wd('POST', `/session/${sid}/actions`, { actions: [{ type: 'pointer', id: 'mouse', parameters: { pointerType: 'mouse' }, actions: [{ type: 'pointerMove', duration: 0, origin: 'viewport', x: Math.round(x), y: Math.round(y) }] }] });
      await move(2, 2);
      await sleep(400);
      const before = await wd('POST', `/session/${sid}/execute/sync`, { script: RECT, args: [] });
      await move(before.x + before.w / 2, before.y + before.h / 2);
      await sleep(400);
      const after = await wd('POST', `/session/${sid}/execute/sync`, { script: RECT, args: [] });
      const d = Math.max(...['x', 'y', 'w', 'h'].map((k) => Math.abs(after[k] - before[k])));
      if (d > 0.5) bad.push(`#finder-area moved/resized on hover by ${d.toFixed(1)}px (${before.x},${before.y} -> ${after.x},${after.y})`);
      if (!after.reduced && after.anim === 'none') bad.push('no shimmer animation running on hover');
      c.hoverNote = `, hover delta ${d.toFixed(1)}px, shimmer ${after.anim}`;
      await move(2, 2);
    }
    if (c.clear) {
      const boxes = [['q', 'Clear program name', 'brightview'], ['town', 'Clear town', 'Roanoke']];
      const find = async (css) => Object.values(await wd('POST', `/session/${sid}/element`, { using: 'css selector', value: css }))[0];
      const STATE = `const [n, lab] = arguments; const i = document.querySelector('[name=' + n + ']'), b = document.querySelector('button[aria-label="' + lab + '"]');
        const r = b ? b.getBoundingClientRect() : null, ir = i.getBoundingClientRect();
        return { val: i.value, focus: document.activeElement === i, btn: !!b, shown: !!r && r.width > 0 && r.height > 0,
          inside: !!r && r.width > 0 && r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight,
          size: r ? Math.round(Math.min(r.width, r.height)) : 0, inInput: !!r && r.left >= ir.left && r.right <= ir.right && r.top >= ir.top && r.bottom <= ir.bottom,
          other: [...document.querySelectorAll('input[name=q],input[name=town]')].filter((x) => x !== i).map((x) => x.value) };`;
      const note = [];
      for (const [name, label, text] of boxes) {
        const other = boxes.find((b) => b[0] !== name);
        await wd('POST', `/session/${sid}/execute/sync`, { script: `const b = document.querySelector('[name=' + arguments[0] + ']'); b.scrollIntoView({ block: 'center' }); return 1;`, args: [name] });
        const el = await find(`[name=${name}]`);
        await wd('POST', `/session/${sid}/element/${el}/clear`, {});
        const before = await wd('POST', `/session/${sid}/execute/sync`, { script: STATE, args: [name, label] });
        if (before.btn && before.shown) bad.push(`${label} visible while the box is empty`);
        await wd('POST', `/session/${sid}/element/${el}/value`, { text });
        if (other) await wd('POST', `/session/${sid}/execute/sync`, { script: `const o = document.querySelector('[name=' + arguments[0] + ']'); o.value = 'keep'; o.dispatchEvent(new Event('input', { bubbles: true })); document.querySelector('[name=' + arguments[1] + ']').focus(); return 1;`, args: [other[0], name] });
        const typed = await wd('POST', `/session/${sid}/execute/sync`, { script: STATE, args: [name, label] });
        if (!typed.btn) bad.push(`no button "${label}"`);
        else if (!typed.shown) bad.push(`${label} not visible with text typed`);
        else if (!typed.inside) bad.push(`${label} outside the window`);
        else if (!typed.inInput) bad.push(`${label} not inside its box`);
        if (typed.btn && typed.size < (res.W < 768 ? 44 : 32)) bad.push(`${label} hit area ${typed.size}px`);
        if (typed.btn) {
          const bt = await find(`button[aria-label="${label}"]`);
          await wd('POST', `/session/${sid}/element/${bt}/click`, {});
          const after = await wd('POST', `/session/${sid}/execute/sync`, { script: STATE, args: [name, label] });
          if (after.val !== '') bad.push(`${label}: box still holds "${after.val}"`);
          if (!after.focus) bad.push(`${label}: focus not back in the box`);
          if (after.shown) bad.push(`${label} still visible after clearing`);
          if (!after.other.every((v) => v === 'keep')) bad.push(`${label} changed the other box (${after.other.join('|')})`);
          note.push(`${name}: ${typed.size}px`);
        }
        if (other) await wd('POST', `/session/${sid}/execute/sync`, { script: `const o = document.querySelector('[name=' + arguments[0] + ']'); o.value = ''; o.dispatchEvent(new Event('input', { bubbles: true })); return 1;`, args: [other[0]] });
      }
      c.hoverNote = (c.hoverNote || '') + `, clear buttons ${note.join(' ')}`;
    }
    if (bad.length) failed = true;
    console.log(`${bad.length ? 'FAIL' : 'PASS'} ${c.name} (crisis ${res.crisis} ${res.crisisBox ? res.crisisBox.display + '/' + res.crisisBox.h + 'px' : ''}, innerWidth ${res.W}x${res.H}${c.desktop || c.tablet ? `, signup ${res.signup && res.signup.y}..${res.signup && res.signup.b}, max scroll doc ${res.maxScroll.doc} body ${res.maxScroll.body}` : ''}${c.scroll ? ', after scrollIntoView' : ''}${c.hoverNote || ''})${bad.length ? ': ' + bad.join('; ') : ''}`);
  }
  {
    const bad = [];
    await wd('POST', `/session/${sid}/window/rect`, { width: 1440, height: 900 });
    await wd('POST', `/session/${sid}/url`, { url });
    await sleep(4000);
    const find = async (css) => Object.values(await wd('POST', `/session/${sid}/element`, { using: 'css selector', value: css }))[0];
    const NOTE = `const n = document.getElementById('finder-house-note'); if (!n) return 'absent'; const r = n.getBoundingClientRect(); return n.hidden || r.width === 0 || r.height === 0 ? 'hidden' : 'shown';`;
    await wd('POST', `/session/${sid}/execute/sync`, { script: `const i = document.querySelector('[aria-label="Type of care"] input[value="recovery_housing"]'); i.click(); return 1;`, args: [] });
    const q = await find('[name=q]');
    await wd('POST', `/session/${sid}/element/${q}/clear`, {});
    await wd('POST', `/session/${sid}/element/${q}/value`, { text: 'atlantic\uE007' });
    let cards = { n: 0, hit: 0 };
    // The search service is a network call (dev API); give a slow answer two more tries before calling it failed.
    for (let t = 0; t < 60 && !cards.hit; t++) {
      if (t > 0 && t % 20 === 0 && !cards.n) await wd('POST', `/session/${sid}/element/${q}/value`, { text: '\uE007' });
      await sleep(500);
      cards = await wd('POST', `/session/${sid}/execute/sync`, { script: `const li = [...document.querySelectorAll('#finder-full .finder-item, #finder-partial .finder-item')]; return { n: li.length, hit: li.filter((x) => x.textContent.includes('Atlantic Outreach Group')).length };`, args: [] });
    }
    if (!cards.n) bad.push('no result cards rendered');
    else if (!cards.hit) bad.push(`${cards.n} cards, none contain "Atlantic Outreach Group"`);
    const shown = await wd('POST', `/session/${sid}/execute/sync`, { script: NOTE, args: [] });
    if (shown !== 'shown') bad.push(`privacy note ${shown} with Recovery housing selected`);
    await wd('POST', `/session/${sid}/execute/sync`, { script: `document.querySelector('[aria-label="Type of care"] input[name=domain][value=""]').click(); return 1;`, args: [] });
    const other = await wd('POST', `/session/${sid}/execute/sync`, { script: NOTE, args: [] });
    if (other === 'shown') bad.push('privacy note still shown for Any type of care');
    if (bad.length) failed = true;
    console.log(`${bad.length ? 'FAIL' : 'PASS'} house search "atlantic" (cards ${cards.n}, with operator ${cards.hit}, note ${shown}, note for Any ${other})${bad.length ? ': ' + bad.join('; ') : ''}`);
  }
  {
    // Live search (tracker 292): results change as the counselor types, with no Enter and no Search button.
    const bad = [];
    await wd('POST', `/session/${sid}/window/rect`, { width: 1440, height: 900 });
    await wd('POST', `/session/${sid}/url`, { url });
    await sleep(4000);
    const find = async (css) => Object.values(await wd('POST', `/session/${sid}/element`, { using: 'css selector', value: css }))[0];
    const exec = (script, args = []) => wd('POST', `/session/${sid}/execute/sync`, { script, args });
    const SNAP = `const li = [...document.querySelectorAll('#finder-full .finder-item, #finder-partial .finder-item')];
      const a = document.activeElement;
      return { n: li.length, atlantic: li.filter((x) => x.textContent.includes('Atlantic Outreach Group')).length,
        status: document.getElementById('finder-status').textContent, focusQ: !!a && a.getAttribute('name') === 'q',
        live: document.getElementById('finder-status').getAttribute('aria-live') };`;
    const until = async (pred, ms = 20000) => { let s; for (let t = 0; t < ms / 250; t++) { s = await exec(SNAP); if (pred(s)) return s; await sleep(250); } return s; };
    // Filter change: Recovery housing is a type-of-care click; results must follow with no other action.
    await exec(`document.querySelector('[aria-label="Type of care"] input[value="recovery_housing"]').click(); return 1;`);
    const housed = await until((s) => s.atlantic > 0);
    if (!housed.atlantic) bad.push('type-of-care change did not update the results (no Atlantic Outreach Group card)');
    const q = await find('[name=q]');
    await wd('POST', `/session/${sid}/element/${q}/click`, {});
    // Typing without Enter: a name that matches nothing empties the list.
    await wd('POST', `/session/${sid}/element/${q}/value`, { text: 'zzqqxx' });
    const none = await until((s) => s.n === 0 && /No programs match/.test(s.status));
    if (none.n !== 0 || !/No programs match/.test(none.status)) bad.push(`typing "zzqqxx" with no Enter left ${none.n} cards, status "${none.status}"`);
    if (!none.focusQ) bad.push('focus left the program-name box when results updated');
    if (none.live !== 'polite') bad.push(`results count line aria-live is "${none.live}", not polite`);
    // Stale guard: hold back the answer to the "zzqqxx" search, type a newer one, then let the old answer land.
    await exec(`window.__real = window.__real || window.fetch; window.__calls = 0;
      window.fetch = function (u, o) { const p = window.__real(u, o); window.__calls++; return /[?&]q=zzqqxx/.test(String(u)) ? p.then((r) => new Promise((ok) => setTimeout(() => ok(r), 4000))) : p; }; return 1;`);
    await wd('POST', `/session/${sid}/element/${q}/clear`, {});
    await wd('POST', `/session/${sid}/element/${q}/value`, { text: 'zzqqxx' });
    await sleep(900);
    await wd('POST', `/session/${sid}/element/${q}/clear`, {});
    await wd('POST', `/session/${sid}/element/${q}/value`, { text: 'atlantic' });
    const fresh = await until((s) => s.atlantic > 0);
    if (!fresh.atlantic) bad.push('typing "atlantic" with no Enter rendered no Atlantic Outreach Group card');
    await sleep(5000);
    const later = await exec(SNAP);
    const calls = await exec('return window.__calls;');
    if (!later.atlantic || /No programs match/.test(later.status)) bad.push(`older "zzqqxx" answer overwrote the newer search (cards ${later.n}, status "${later.status}")`);
    await exec(`window.fetch = window.__real; return 1;`);
    // Enter still searches at once.
    await wd('POST', `/session/${sid}/element/${q}/clear`, {});
    await wd('POST', `/session/${sid}/element/${q}/value`, { text: 'zzqqxx' });
    const entered = await until((s) => s.n === 0 && /No programs match/.test(s.status));
    if (entered.n !== 0) bad.push('Enter no longer searches');
    if (bad.length) failed = true;
    console.log(`${bad.length ? 'FAIL' : 'PASS'} live search (type of care -> ${housed.atlantic} Atlantic card(s), typed "zzqqxx" -> ${none.n} cards "${none.status}", focus kept ${none.focusQ}, newer "atlantic" -> ${fresh.atlantic}, still ${later.atlantic} after the delayed old answer, ${calls} search calls, Enter -> ${entered.n} cards)${bad.length ? ': ' + bad.join('; ') : ''}`);
  }
} finally {
  await wd('DELETE', `/session/${sid}`).catch(() => {});
}
console.log(failed ? 'RESULT FAIL' : 'RESULT PASS');
process.exit(failed ? 1 : 0);
