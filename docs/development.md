# Development Guide — kerrigan-landing-page

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Hugo extended | v0.128.0 | [gohugo.io](https://gohugo.io/installation/) |
| Git | any | system package manager |

> **Extended** edition is required (CSS processing). Standard Hugo will fail.

### Install Hugo (macOS/Linux)

```bash
# macOS with Homebrew
brew install hugo

# Verify — must show "extended"
hugo version
# Expected: hugo v0.128.0+extended ...
```

### Install Hugo (Windows)

```powershell
# Winget
winget install Hugo.Hugo.Extended

# Or via Chocolatey
choco install hugo-extended
```

## Local Development

```bash
# Clone
git clone https://github.com/LatentWorx-LTD/kerrigan-landing-page
cd kerrigan-landing-page

# Start dev server with live reload
hugo serve

# Visit http://localhost:1313
```

`hugo serve` watches all files and rebuilds on every save. The Formspree form will submit live even in development (use a test email or disable the form locally if needed).

## Content Editing

All content lives in `content/`. Files use YAML front matter.

### Homepage (`content/_index.md`)

Controls the homepage `title`, `description`, and `keywords` (used for SEO). The visual sections are in `layouts/index.html`.

```yaml
---
title: "Kerrigan — Secure Cloud AI for Behavioral Health Documentation"
description: "..."
keywords: ["keyword1", "keyword2"]
---
```

### Thank-you page (`content/thank-you.md`)

Displayed after successful Formspree form submission. Edit freely — no special front matter required beyond `title`.

## Styles

Site styles are in `assets/css/design-system.css`; the finder page's styles are in `assets/css/finder.css`. There is no preprocessor for CSS. Hugo bundles `assets/` when it builds or serves.

### Finder shell rule

The finder page (`layouts/_default/finder.html`, `assets/css/finder.css`, `assets/js/finder.js`) is a fixed, window-high shell from the tablet breakpoint (768px) up. It does not scroll as a page unless the window is too short for the stage's floor (`--finder-stage-min`, 200px). Below 768px (phone) the page scrolls and the map is `70dvh`.

- The page body is `100dvh`. No `vh` unit is allowed in the finder styles (it ignores phone toolbars); `make finder-style-lint` fails on it.
- The header rows and the map stage are grid or flex rows. The stage takes the remaining space (`1fr`, or `flex: 1` with `min-height: 0`).
- No height is "window minus N px". A constant like that silently encodes the height of every row above it (the 2026-11-12 incident).
- Overlay offsets are the `--finder-*` custom properties at the top of `finder.css` (`--finder-gap`, `--finder-overlay-top`, `--finder-list-w`, `--finder-panel-w`, `--finder-nudge`, `--finder-basemap-h`, `--finder-stage-min`). `finder.js` reads them with `getComputedStyle`, so changing one moves the CSS and the map padding together.
- Breakpoints are `--bp-narrow`, `--bp-tablet` and `--bp-desktop` in `design-system.css`. `finder.js` reads them. `@media` cannot read custom properties, so the same widths are also written in `finder.css`: two places, not one source. `make finder-style-lint` fails when an `@media` width in `finder.css` is not one of the tokens (max-width queries use the token minus 0.02px), so the two cannot drift.
- z-index values are the `--z-*` scale in `design-system.css`; `finder.css` may use only `var(--z-*)`, and the lint enforces it.
- The lint also fails on a duplicate selector in one context and on `!important`. Keep one rule block per component, its breakpoints beside it.
- Any layout change runs `make controls-check` (it needs a running finder, see the `Makefile`) and `make finder-style-lint`. The check asserts the map controls, the search bar, the results toggle and the list and map are on screen at desktop, tablet and phone sizes, with no sideways overflow. Both run in CI (`.gitea/workflows/finder-check.yml`) on every push and pull request.

Background: [`docs/audits/2026-11-12-finder-page-structure.md`](audits/2026-11-12-finder-page-structure.md).

## Production Build

```bash
# Build for production (minified, with baseURL)
hugo --gc --minify

# Output is in public/
# public/ is gitignored and regenerated on every deploy
```

## Deployment

Deployment is fully automated via `.github/workflows/deploy.yml`:
- Trigger: push to `main`
- Build: Hugo extended v0.128.0 with `--minify`
- Deploy: GitHub Pages to `latentworx.com`

No manual deployment steps are needed. All changes to `main` go live within ~1 minute.

## Governance

### When a PR needs a piece plan

| Change type | Needs piece plan? |
|-------------|------------------|
| Copy / SEO edits | No |
| New section or page | Yes |
| Layout restructure | Yes |
| New external dependency | Yes |
| Workflow / CI changes | Yes |

Piece plans live in `mvp-control-plane/docs/implementation/pieces/`.

### PR checklist

See [`.github/pull_request_template.md`](../.github/pull_request_template.md).

### ADRs

Significant structural decisions should be recorded in `docs/decisions/`. See the [ADR README](./decisions/README.md) for format and process.

## Troubleshooting

### Hugo not found

Ensure Hugo extended (not standard) is installed:
```bash
hugo version  # must include "+extended"
```

### Port conflict

```bash
hugo serve --port 1314
```

### Build warnings about missing image

`og-kerrigan.png` is referenced in `hugo.toml` (`[params].ogImage`) but the file is not yet present. Add it at `static/img/og-kerrigan.png` (recommended: 1200×630px) to resolve.

## References

- [Hugo documentation](https://gohugo.io/documentation/)
- [Architecture](./architecture.md)
- [ADRs](./decisions/README.md)
- [Formspree](https://formspree.io/forms/mwvreeno/submissions)
