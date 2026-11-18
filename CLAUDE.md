# kerrigan-landing-page

Hugo static site for latentworx.com (Kerrigan marketing, request-access form, public finder page).
No PHI, no app code. Forge: `LatentWorx-Beck/kerrigan-landing-page` (remote `forge`); GitHub
mirror `Coalescent-Emergence/kerrigan-landing-page` (remote `github`). The repo is **public**: no
secrets, no internal hostnames beyond what is already in the tree.

## Merging publishes the site
- A merge to `main` is the release: `.github/workflows/deploy.yml` builds on GitHub, deploys GitHub
  Pages and submits the sitemap to IndexNow. The forge mirrors `main` to GitHub.
- **The owner merges landing-page PRs. Agents open them and never merge** (owner, 2026-11-18: "I merge").
- Nothing builds before merge on GitHub; on the forge, `.gitea/workflows/finder-check.yml` runs the
  finder checks on every push and PR, and `image.yml` builds the dev preview image.
- Push to the forge over HTTPS (ssh DNS fails in the sandbox). Open the PR with the `gitea-forge`
  skill, body copied from `.github/pull_request_template.md`.

## Build and test
- Hugo **extended 0.161.1** is pinned in `.github/workflows/deploy.yml`, `.gitea/workflows/finder-check.yml`
  and `deploy/Dockerfile`. The local nixpkgs hugo is newer (0.168.0 on 2026-11-18); treat a local-only
  warning as drift, not a bug. No npm: no `package.json`, `package-lock.json` is an empty stub.
- `hugo server` (live reload at :1313) · `hugo --gc --minify` (production-like build into `public/`)
- `node --test assets/js/*.test.mjs scripts/*.test.mjs` (50 pass) · `go test scripts/indexnow*.go`
- `make finder-style-lint` (no site needed).
- `make care-type-check` reads the built `public/finder/index.html`. **Known issue:** it fails on the plain
  `hugo --gc --minify` build (the finder page has no `name="domain"` inputs there) and passes only on the CI
  build: `hugo --gc --config hugo.toml,deploy/finder-stub.toml --baseURL http://127.0.0.1:1313/`.
  Not fixed here.
- Browser checks (`controls-check`, `domain-check`, `org-check`, `matched-check`, `transit-check`) need
  headless Firefox plus geckodriver on :4444. Run on the CI stub build, which CI serves with
  `node scripts/finder-stub-api.mjs 1314` and `python3 -m http.server 1313 --bind 127.0.0.1 --directory public`.
  `nav-check` needs `make finder-preview` against the live dev search service; not run in CI.
- geckodriver is not on PATH here, but `nix shell nixpkgs#geckodriver -c geckodriver --port 4444` works
  (0.36.0, same as CI). Firefox is `/run/current-system/sw/bin/firefox`; set `MOZ_HEADLESS=1`.
  Example: start the stub API, the static server and geckodriver as above, then
  `MOZ_HEADLESS=1 make controls-check`; `FINDER_BASE_URL=http://127.0.0.1:1313 make org-check`.
  All five CI-style checks passed on trunk `0efb762` on 2026-11-18 this way.

## Off limits without the owner
- Feature gates in `hugo.toml`: `signupsEnabled`, `finderEnabled`, `finderTransit` (and `signupUrl`).
- Analytics keys and the deploy workflow (`.github/workflows/deploy.yml`; `POSTHOG_KEY` is a repo secret).
- Pricing, and legal pages: `content/legal/`, `content/terms.md`, `content/refunds.md`, `content/privacy.md`.

## Where things are
- Homepage sections and the request-access form (`id="access"`, posts to Formspree): `layouts/index.html`;
  copy and SEO front matter: `content/_index.md`.
- Analytics: `layouts/_default/baseof.html`. `trackEvent` sends to PostHog (key `params.posthogKey`, set in CI);
  GA4 (`ga4MeasurementId`) and Clarity (`clarityProjectId`) hooks exist but are empty in `hugo.toml`.
  Events come from `data-analytics-event` / `data-analytics-label` attributes (e.g. `cta_click_access`).
- Finder: `layouts/` finder templates, `assets/css/finder.css`, `assets/js/`, overlays in `deploy/`.
- Piece plans: `docs/plans/<issue>-<slug>.md`, required for new sections/pages, layout restructures,
  new dependencies and CI changes; not for copy/SEO edits. ADRs: `docs/decisions/` (MADR).
- PR template: `.github/pull_request_template.md`. Dev guide: `docs/development.md`.
  `docs/architecture.md` is stale (see its top note).

## Work tracking
Issues live in the gtm tracker `LatentWorx-Beck/tracker` on the forge (name the repo on every call).
The user-global `~/.claude/CLAUDE.md` rules still load; they are not repeated here.
