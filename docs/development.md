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
git clone https://github.com/Coalescent-Emergence/kerrigan-landing-page
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
title: "Kerrigan — Clinical AI That Stays On Your Premises"
description: "..."
keywords: ["keyword1", "keyword2"]
---
```

### Thank-you page (`content/thank-you.md`)

Displayed after successful Formspree form submission. Edit freely — no special front matter required beyond `title`.

## Styles

All styles are in `static/css/main.css`. There is no preprocessor or build step for CSS — changes are reflected immediately when Hugo serves the file.

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
- Deploy: GitHub Pages to `kerrigan.jhax.dev`

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

See [`.github/PULL_REQUEST_TEMPLATE.md`](../.github/PULL_REQUEST_TEMPLATE.md).

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
