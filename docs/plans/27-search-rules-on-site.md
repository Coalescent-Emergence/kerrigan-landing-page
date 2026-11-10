# Search rules on the site — tracker 27 (https://git.jhax.dev:30300/LatentWorx-Beck/tracker/issues/27)

## Steps
1. Replace `layouts/robots.txt` with `*` plus a named `Allow: /` group for each search and AI-answer crawler in the rules file section 12; training-only tokens (GPTBot, ClaudeBot, CCBot, Google-Extended, Applebot-Extended) stay under `*`, unnamed; `Sitemap: {{ .Site.BaseURL }}sitemap.xml`.
2. Gate the Organization block in `layouts/partials/jsonld.html` on `.IsHome`; add `"description" .Site.Params.description`.
3. Add `By <a href="/">LatentWorx</a> &middot;` before "Published" in `layouts/articles/single.html`, matching `Article.author`.
4. Add `<a href="/articles/">Articles</a>` to `footer-links` in `layouts/partials/site-footer.html`.
5. Commit this plan as `docs/plans/27-search-rules-on-site.md`.

## Acceptance
- [ ] robots.txt names every search and AI-answer crawler, names no training-only crawler, disallows nothing, carries the sitemap line.
- [ ] Organization markup only on the home page, with a description.
- [ ] Articles show a byline matching their markup author.
- [ ] Every page links to /articles/.

## Out of scope
- Training-crawler stance: unchanged, admitted by `*` as today.
- Home canonical (LinkedIn trade-off), about page, AI disclosure, sameAs: owner calls.
- `legalName`: no formation document; drafts only.
- Bing token: Microsoft page is a JS shell; `*` admits it.
- Article image set: needs new artwork.
- Home sitemap `lastmod`; IndexNow, Rich Results Test (tracker 28).

## Depends on
- nothing

## Test plan (repo root, after `hugo --quiet`)
- `grep -cE '^User-agent: (GPTBot|ClaudeBot|CCBot|Google-Extended|Applebot-Extended)$' public/robots.txt` — `0`; every search and AI-answer token in section 12 has its own `User-agent:` line
- `grep -c '^Disallow' public/robots.txt` — `0`
- `grep '^Sitemap:' public/robots.txt` — `Sitemap: https://latentworx.com/sitemap.xml`
- `grep -c '"@context":"https://schema.org","@type":"Organization"' public/index.html public/privacy/index.html public/articles/ai-scribes-42-cfr-part-2/index.html` — `1`, `0`, `0`
- `grep -c '"description":"An AI scribe for behavioral' public/index.html` — `1`
- `grep -cE 'By <a href="?/"?>LatentWorx</a>' public/articles/*/index.html` — `1` each
- `grep -cE 'href="?/articles/"?' public/index.html public/privacy/index.html` — each ≥`1`
- `grep -o '<loc>' public/sitemap.xml | wc -l` — `7`
- `for f in public/index.html public/articles/*/index.html; do grep -oE '<script type="?application/ld\+json"?>[^<]*' "$f" | sed 's/^[^>]*>//' | jq -e . >/dev/null || echo "BAD $f"; done` — no output
