# Crisis care and houses in the finder — Finder page has no crisis-care choice, and an all-types search leaves out recovery houses (https://git.jhax.dev:30300/LatentWorx-Kerrigan/tracker/issues/291)

## Steps
1. Branch `fix/291-crisis-and-houses` from `main` (12c330f, PR 34 merged).
2. `layouts/_default/finder.html`: add radio `domain` value `crisis`, label "Crisis care", after Mental health.
3. `assets/js/finder.js`: add `mapDomainParams` to `apiParamsFor`. An empty `domain` becomes every non-empty `name=domain` radio value in form order: `addiction,mental_health,crisis,recovery_housing`. A chosen value is sent as is.
4. `finder.js` `resetCrisis`: ignore `crisis` when `domain` is the all-types list. The strip shows for an explicit crisis choice or detox only.
5. `finder.js` `syncHouseNote`: show the note for Any and for recovery housing.
6. Add `scripts/finder-domain-check.mjs`, with a stub API like `finder-matched-check.mjs`. Add a `make domain-check` target and a `finder-check.yml` step.
7. Push the branch, then merge `dev/287-landing` (d7c990b) with it into `dev/291-landing`. CI `image.yml` pushes `ghcr.io/coalescent-emergence/kerrigan-landing:<sha7>`. Then open an lwx-infra PR that pins `manifests/kerrigan/overlays/dev/landing-site.yaml` to that tag@digest.

## Acceptance
- [ ] Crisis care is choosable on the page and returns crisis programs
- [ ] A search with no type includes recovery houses
- [ ] The page check lists crisis care as offered

## Out of scope
- `NotOffered["domain=crisis"]` at kerr-finder `internal/findability/page.go:19` (PR 25): the 286 story removes it.
- kerr-finder README:221 still says "`crisis` matches nothing yet", which is stale.

## Depends on
- PR 34 (rebase after it merges)

## Test plan
- `curl -s "https://api.jhax.dev/finder/v1/search?q=atlantic+outreach&domain=addiction,mental_health,crisis,recovery_housing" | jq .total` — `36`
- `curl -s "https://api.jhax.dev/finder/v1/search?domain=crisis" | jq .total` — `53`
- `make domain-check` — exit 0. Any sends the four-value list, Crisis care sends `crisis`, the strip is hidden on Any and shown on crisis.
- `curl -s https://landing.jhax.dev/finder/ | grep -c 'name=domain value=crisis'` — `1`
- `go run ./cmd/kerr-finder pagecheck -page https://landing.jhax.dev/finder/` (PR 25 checkout) — `pagecheck passed`
