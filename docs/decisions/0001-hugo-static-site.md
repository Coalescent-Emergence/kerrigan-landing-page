# 1. Hugo as Static Site Generator for kerrigan-landing-page

Date: 2026-03-04

## Status

Accepted

## Context

Kerrigan needs a public-facing landing page to capture waitlist signups, communicate the product value proposition, and serve as the canonical external entry point for the Pilot Launch (U5). The site must be fast, maintainable by a solo developer, and deployable without server-side infrastructure.

Key requirements:
- Public waitlist / lead capture form
- SEO-optimized static output
- Zero server-side runtime cost
- Deployable via GitHub Pages (free, reliable, CDN-backed)
- Markdown-first content authoring

## Decision Drivers

* **Zero ops overhead**: No server to maintain; static files served directly
* **Deployment simplicity**: GitHub Actions + GitHub Pages is already in use across the org
* **Speed**: Pre-rendered HTML delivers excellent Core Web Vitals with no hydration
* **Solo developer ergonomics**: Hugo's hot-reload dev server and Markdown content model fit the workflow
* **Existing org knowledge**: `jk4y.com` already runs on Hugo; pattern is established

## Considered Options

* **Hugo** — Go-based static site generator, single binary, extremely fast builds
* **Next.js (static export)** — React-based, rich ecosystem, familiar to JS devs
* **Plain HTML/CSS** — No build step, maximum simplicity

## Decision Outcome

Chosen option: **Hugo**, because it provides fast builds, a content-first Markdown model, and aligns with the existing org pattern (`jk4y.com`). GitHub Pages deployment is trivial with the existing `deploy.yml` workflow.

### Consequences

* Good, because builds are sub-second even at scale; no performance concerns
* Good, because content changes (copy, SEO) require only Markdown edits, no code changes
* Good, because reuses the deployment workflow pattern already in the org
* Bad, because Hugo's templating (Go templates) has a learning curve for contributors unfamiliar with it
* Bad, because adding interactive features (e.g., dynamic waitlist stats) requires external JS or a separate service
* Neutral, because theming is custom CSS; no component library lock-in

## Pros and Cons of the Options

### Hugo

* Good, because instant builds and hot reload accelerate iteration
* Good, because single binary — no Node/npm dependency tree to manage
* Good, because strong SEO features: `robots.txt`, `sitemap.xml`, canonical URLs built-in
* Bad, because Go template syntax is less familiar than JSX or Jinja

### Next.js (static export)

* Good, because React ecosystem is broad; easy to add interactive components
* Bad, because `npm install` and a large dependency tree for a simple marketing page
* Bad, because static export limits some Next.js features; mismatch with use case

### Plain HTML/CSS

* Good, because zero build tooling
* Bad, because no content management abstraction; every copy edit touches raw HTML
* Bad, because no partials/layouts; duplication grows with site size

## Validation

* Site passes `hugo build --minify` with zero warnings in CI
* Lighthouse score ≥ 90 on Performance, SEO, and Accessibility
* Deployment to `kerrigan.jhax.dev` succeeds via existing `deploy.yml` on every push to `main`

### Revisit Criteria

* If interactive features (dashboards, auth) are needed that cannot be served statically
* If a design system or component library becomes a hard requirement

## Links

* [Org ADR-0001: Multi-Repo Architecture](https://github.com/Coalescent-Emergence/.github/tree/main/docs/decisions/0001-multi-repo-architecture.md)
* [deploy.yml](../../.github/workflows/deploy.yml)
* [Hugo documentation](https://gohugo.io/documentation/)
