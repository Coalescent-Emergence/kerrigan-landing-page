# Architecture Decision Records

This directory contains **repository-specific** ADRs for `kerrigan-landing-page`.

For **organization-wide** ADRs, see [`.github/docs/decisions/`](https://github.com/Coalescent-Emergence/.github/tree/main/docs/decisions).

## What Goes Here

- Technology stack choices specific to this Hugo site
- Hosting / deployment decisions
- CSS/layout tooling decisions
- SEO or analytics tooling decisions

## ADR Format

Uses the **MADR** format. Copy [`template.md`](./template.md) to create a new ADR.

ADR linting is enforced by the `adr-guard` org workflow when files in this directory are modified.

## ADR Lifecycle

1. **Proposed** — draft open for review
2. **Accepted** — decision approved
3. **Deprecated** — outdated, kept for history
4. **Superseded** — replaced by newer ADR (link included)

## Current ADRs

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [0001](./0001-hugo-static-site.md) | Hugo as Static Site Generator | Accepted | 2026-03-04 |

## Creating New ADRs

1. Copy [`template.md`](./template.md)
2. Increment the sequence number (e.g., `0002`)
3. Fill in all sections
4. Submit as PR with `type:architecture` label
5. Update this README table

## References

- [Org ADR README](https://github.com/Coalescent-Emergence/.github/tree/main/docs/decisions/README.md)
- [MADR Documentation](https://adr.github.io/madr/)
- [AI Playbook](https://github.com/Coalescent-Emergence/.github/blob/main/AI_PLAYBOOK.md)
