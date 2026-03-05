# GitHub Copilot Instructions for kerrigan-landing-page

This repository contains the public-facing landing page for **Kerrigan** — AI-powered session transcription and clinical note generation for behavioral health, running entirely on-premises.

## Tech Stack

- **Static Site Generator**: Hugo (extended, v0.128.0)
- **Deployment**: GitHub Pages via GitHub Actions (`.github/workflows/deploy.yml`)
- **Styles**: Custom CSS at `static/css/main.css`
- **Forms**: Formspree (waitlist capture, ID: `mwvreeno`)
- **Domain**: `kerrigan.jhax.dev`

## Repository Purpose

This is a **marketing / waitlist site**, not application code. It is:
- The primary public entry point for the Kerrigan product
- U5 (Pilot Launch) scope — part of the `mvp-control-plane` planning structure
- Subject to the same governance rules as all Coalescent-Emergence repositories

## Organization Governance

This repository participates in the Coalescent-Emergence planning and agent framework:

- **Org ADRs**: [`org-dot-github/docs/decisions/`](https://github.com/Coalescent-Emergence/.github/tree/main/docs/decisions)
- **Repo ADRs**: [`docs/decisions/`](./docs/decisions/README.md)
- **Control plane primer**: [`mvp-control-plane/docs/primers/kerrigan-landing-page.md`](https://github.com/Coalescent-Emergence/mvp-control-plane/blob/main/docs/primers/kerrigan-landing-page.md)
- **AI Playbook**: [`org-dot-github/AI_PLAYBOOK.md`](https://github.com/Coalescent-Emergence/.github/blob/main/AI_PLAYBOOK.md)
- **AI agents** (org-level, inherited automatically): Technical Decomposer, Architecture Guardian, ADR Generator, MVP Clarifier, Story Generator

## Guidelines

- Content changes (copy, SEO) do not require a piece plan; layout/structural changes do.
- PRs that modify `docs/decisions/` must follow MADR format (enforced by `adr-guard` workflow).
- No PHI or patient data is ever stored here — this is a public static site.
- Keep Hugo frontmatter in YAML; do not switch to TOML for content files.
- SEO: maintain `description`, `keywords`, and proper heading hierarchy (`h1` → `h2` → `h3`).
- Accessibility: use semantic HTML; alt text on all images.
- For Hugo-specific help, consult [`docs/development.md`](./docs/development.md).

## Initiative Linkage

Changes beyond routine content updates should be linked to a control-plane child issue:
- Initiative ID prefix: `MVP-U5` (Pilot Launch umbrella)
- PR template is at [`.github/PULL_REQUEST_TEMPLATE.md`](./.github/PULL_REQUEST_TEMPLATE.md)
