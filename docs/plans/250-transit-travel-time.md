---
title: Plan 250 kerrigan-landing-page — client-home pin and transit times, behind a dev-only finderTransit flag
summary: >
  The finder is on in production since tracker 256, so finderEnabled no longer keeps prod clean; a new
  finderTransit param, set only in deploy/finder-dev.toml, gates a pin control and finder-transit.js that
  posts the pin only to /finder/v1/travel. Prod build diff is empty; served on landing.jhax.dev via the dev pin.
kind: plan
status: live
created: 2026-11-13
issue: https://git.jhax.dev:30300/LatentWorx-Kerrigan/tracker/issues/250
related: [kerrigan-250-plan-kerr-finder.md, kerrigan-250-plan-lwx-infra.md]
files_to: kerrigan-landing-page docs/plans/250-transit-travel-time.md
---
# Client-home pin on the finder map — issue 250 (https://git.jhax.dev:30300/LatentWorx-Kerrigan/tracker/issues/250)

## Steps
1. Add `finderTransit = true` to `deploy/finder-dev.toml` only; `hugo.toml` gets no value.
2. Edit `layouts/_default/finder.html`: under `{{ if eq site.Params.finderTransit true }}`, a "Set client's home" button and the fingerprinted, SRI-tagged `js/finder-transit.js`.
3. Add `assets/js/finder-transit.js`: a map click places one draggable MapLibre marker, held in page memory only (no storage, URL, geolocation, address field or geocoder; never sent to search or crisis). On pin move or new results it POSTs `{lat,lng,ids}` to `data-api + '/v1/travel'` (`credentials: 'omit'`). Cards show "About N min by transit", or "X km straight line · Plan the trip with <agency>" linking `agency.url`.
4. Add `assets/js/finder-transit.test.mjs`: request shape, both texts, unsafe URL rejected.
5. Add `scripts/finder-transit-check.mjs` and `make transit-check`: headless Firefox records every request after a pin; only the travel request carries its coordinates.

## Acceptance
- [ ] Given a pin in central Richmond and a search there, when travel times load, then each result shows a transit time or the distance with a trip-planner link
- [ ] Given the browser's network log, when a pin is placed, then the only request carrying the coordinates goes to the finder's travel endpoint
- [ ] Given this slice's landing-page PR, when checked, then the production renders are byte-identical and the flag-off site build has no finder page or script

## Out of scope
- Merging to main; the `landing-site.yaml` dev pin (lwx-infra).

## Depends on
- `POST /finder/v1/travel` on api.jhax.dev (kerr-finder plan).

## Test plan
- `hugo --gc --minify --config hugo.toml -d /tmp/p-main` (main) and `-d /tmp/p-br` (branch), then `diff -r /tmp/p-main /tmp/p-br`: no output.
- `hugo --config hugo.toml,/tmp/off.toml -d /tmp/off` (`finderEnabled = false`), then `find /tmp/off -name 'finder*'`: no output.
- `node --test assets/js/finder-transit.test.mjs`: `fail 0`.
- `make transit-check NAV_URL=https://landing.jhax.dev`: `only /finder/v1/travel carried the pin`.
