// Page check (tracker 285): fails when the search service supports a type of care (the `domain`
// filter) that the finder page does not offer, or when the page offers one the service does not.
//
// The service's list is NOT fetched from the live dev service (tracker 293: a check that depends
// on live dev fails when dev is down). It is read from scripts/fixtures/finder-service-domains.json,
// a copy of `filterValues["domain"]` in kerr-finder internal/catalog/facets.go at a pinned commit
// (the fixture names the commit and file line). The page's list is read from the built page HTML.
// A type of care the service accepts but the page deliberately omits goes in the fixture's
// `not_offered`, with the reason. To follow the service: read facets.go at its new commit and update
// the fixture's ref and domains in the same PR; this check then names what the page lacks.
//
//   hugo --config hugo.toml,deploy/finder-stub.toml ... && node scripts/finder-care-type-check.mjs [public/finder/index.html]
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Values of the page's type-of-care radios (name="domain"); the empty "Any" value is not a type of care.
export function pageDomains(html) {
  const out = [];
  for (const m of html.matchAll(/<input\b[^>]*>/g)) {
    const tag = m[0];
    if (!/\bname="domain"/.test(tag)) continue;
    const v = (tag.match(/\bvalue="([^"]*)"/) || [])[1];
    if (v) out.push(v);
  }
  return out;
}

// Problems as strings; empty means the page and the service agree.
export function compare(fixture, offered) {
  const bad = [];
  const exempt = fixture.not_offered || {};
  for (const d of fixture.domains) {
    if (!offered.includes(d) && !(d in exempt)) bad.push(`the search service supports type of care "${d}" (kerr-finder ${fixture.ref.slice(0, 7)}) but the page does not offer it; add it to the Type of care choices, or list it under not_offered with the reason`);
  }
  for (const d of offered) {
    if (!fixture.domains.includes(d)) bad.push(`the page offers type of care "${d}" but the service (kerr-finder ${fixture.ref.slice(0, 7)}) does not list it`);
  }
  if (!offered.length) bad.push('no type-of-care choices (input name="domain") found in the page');
  return bad;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const page = process.argv[2] || 'public/finder/index.html';
  const fixture = JSON.parse(readFileSync(new URL('./fixtures/finder-service-domains.json', import.meta.url), 'utf8'));
  const offered = pageDomains(readFileSync(page, 'utf8'));
  const bad = compare(fixture, offered);
  if (bad.length) { for (const b of bad) console.error('FAIL ' + b); process.exit(1); }
  console.log(`PASS page offers ${offered.join(', ')}; service ${fixture.ref.slice(0, 7)} supports ${fixture.domains.join(', ')}; exempt ${Object.keys(fixture.not_offered || {}).join(', ') || 'none'}`);
}
