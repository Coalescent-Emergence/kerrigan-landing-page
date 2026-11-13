<!--
Write for a reader with zero context, weeks from now.
Fast part: the summary line, What and Why. Everything else is one line or folded.
Long reasoning goes in a design doc, linked below, never here.
Delete any folded block that would be empty.
-->

> <One sentence: what this merge changes, as an outcome. No file names or numbers.>

**Issue:** <tracker issue URL, step if any> · **Design:** <doc URL, or "none">

## What
| Area | Change |
|---|---|
| <system, in plain words> | <one line> |

## Why
<1–3 sentences: the problem, and what this unblocks.>

## Left out / follow-ups
- <deliberately not done, and why, in one clause>
- <next step, with its issue link>

## Rollout
- **Effect on merge:** <restarts, downtime, or "none">
- **Check it worked:** <one command or query, and the expected result>
- **Rollback:** <revert, re-pin, or why revert is not safe>

## Site checks
- [ ] `hugo --gc --minify` builds clean (nothing builds before merge; merging publishes the site)
- [ ] Changed pages checked in a browser at desktop and phone width
- [ ] Layout change: controls on screen — `make controls-check` passes (CI runs it)
- [ ] No PHI, secrets or private agreement text (the repo history is public; a revert does not un-publish)
- [ ] SEO: description and keywords, canonical and og, noindex and sitemap right for changed pages
- [ ] `docs/decisions/` edits follow MADR

<details><summary>Approach</summary>

<Alternatives considered or rejected, and why.>
</details>

<details><summary>Verification run</summary>

- [x] <check> → <result>
</details>

<details><summary>Files</summary>

- `<path>`: <what changed in it>
</details>
