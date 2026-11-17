# Google and Bing find and index every page on the site (https://git.jhax.dev:30300/LatentWorx-Beck/tracker/issues/73)

## Steps
1. Delete the sitemap-disable and `noindex` lines in `content/_content.gotmpl`.
2. Emit `rel=canonical` on every page (`layouts/_default/baseof.html`); the home keeps no `og:url` (LinkedIn card address).
3. Title the home from `.Title` and `content/_index.md`.
4. Replace the hero H1 and first sub in `layouts/index.html`.
5. Add an Articles section to `layouts/index.html` linking each live article by title.
6. Add `static/<key>.txt` (32 hex), the IndexNow key file.
7. Add `scripts/indexnow.go` (stdlib Go) submitting every sitemap URL.
8. Add job `indexnow` (`needs: deploy`) to `.github/workflows/deploy.yml`.
9. Commit this plan.

## Acceptance
- [ ] The home page declares its own canonical address
- [ ] The home page's title and main heading say what Kerrigan is, with claims checked against the claims table
- [ ] The home page links each live article by name
- [ ] Every sitemap page is sent to IndexNow on each publish, and the key file is served at the site root
- [ ] The finder is open to Google: no noindex and listed in the sitemap, checked on the live site
- [ ] Every sitemap page answers 200 with no hidden-from-Google setting, checked on the live site

## Out of scope
- Search Console; tracker 27.
- Home title and H1 copy ship in a second PR after the owner picks the wording.

## Test plan
- `hugo --minify -d /tmp/p`; home has one `rel=canonical href=https://latentworx.com/`.
- Sitemap lists `/finder/`; finder page has no `noindex`.
- `go run scripts/indexnow.go -dry-run -sitemap /tmp/p/sitemap.xml` prints every sitemap URL.
- After merge: each sitemap URL answers 200; the `indexnow` job log shows `HTTP 200` or `202`.
