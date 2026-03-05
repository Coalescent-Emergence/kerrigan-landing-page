# Architecture — kerrigan-landing-page

## Overview

`kerrigan-landing-page` is a Hugo static site deployed to GitHub Pages. It serves as the primary public entry point for the Kerrigan product — capturing waitlist signups and communicating value to prospective behavioral health clinic operators.

No PHI is processed or stored here. This is a fully public static site.

## System Context (C4 Level 1)

```
[Visitor browser]
      │
      ▼
[GitHub Pages CDN]  ←── static files ───  [Hugo build / GH Actions]
      │                                           │
      │                                    [kerrigan-landing-page repo]
      │                                     content/, layouts/, static/
      │
      ▼
[Formspree]  ───── waitlist submission ────►  [founder email]
```

## Containers (C4 Level 2)

| Container | Technology | Purpose |
|-----------|-----------|---------|
| Static site | Hugo + HTML/CSS | Rendered pages served via GitHub Pages |
| Form backend | Formspree (`mwvreeno`) | Waitlist email capture; no server needed |
| CI/CD | GitHub Actions (`deploy.yml`) | Build and deploy on every push to `main` |

## Directory Structure

```
kerrigan-landing-page/
├── hugo.toml                  # Site configuration (baseURL, params, markup)
├── content/
│   ├── _index.md              # Homepage front matter and content
│   └── thank-you.md           # Post-submission confirmation page
├── layouts/
│   ├── index.html             # Homepage template
│   └── _default/
│       ├── baseof.html        # Base skeleton (head, body wrapper)
│       ├── single.html        # Single page template
│       └── taxonomy.html      # Taxonomy page (unused; disableKinds applied)
├── static/
│   ├── CNAME                  # kerrigan.jhax.dev
│   └── css/
│       └── main.css           # All site styles
├── docs/                      # Governance and architectural documentation
│   ├── architecture.md        # This file
│   ├── development.md         # Local dev setup
│   └── decisions/             # Repository-specific ADRs
└── .github/
    ├── copilot-instructions.md
    ├── PULL_REQUEST_TEMPLATE.md
    └── workflows/
        └── deploy.yml         # Hugo build + GitHub Pages deploy
```

## Key Technical Decisions

- [ADR-0001: Hugo as Static Site Generator](./decisions/0001-hugo-static-site.md)

## External Dependencies

| Dependency | Purpose | PHI risk |
|------------|---------|----------|
| GitHub Pages | Static hosting | None |
| Formspree | Form submission | None (name/email only, no clinical data) |
| Hugo extended | Site build | N/A (build-time only) |

## Compliance Notes

- No PHI is collected, processed, or stored by this site
- The waitlist form collects name and email only (Formspree)
- Site is public (no authentication required)
- Deployment is via GitHub Actions with `contents: read` minimum permissions

## Related

- [mvp-control-plane primer](https://github.com/Coalescent-Emergence/mvp-control-plane/blob/main/docs/primers/kerrigan-landing-page.md)
- [Kerrigan backend primer](https://github.com/Coalescent-Emergence/mvp-control-plane/blob/main/docs/primers/kerrigan.md)
