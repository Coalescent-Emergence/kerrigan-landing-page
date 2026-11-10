---
title: Plan — article page design (width, headings, eye flow, table of contents, quick links)
summary: >
  The reading column is about 800 px at 1920, about 80 characters a line. Body text scales from 17 to 21 px and the column is 38 × the body size. A sticky "On this page" rail sits beside it from 1180 px up; below that it becomes a collapsed list under the title. Colour stays quiet: pastel cyan section headings with a small cyan-to-green bar, pastel green subheadings, a green-bordered "In brief" panel, and cobalt kept for links. Two pieces: template and CSS stacked on the articles preview branch, and a separate content piece. In it a writer drafts three missing In-brief summaries from claims already in each article, and a checker verifies each bullet. The owner looks at 1920 and 1440 screenshots before merge.
kind: plan
status: live
created: 2026-11-09
issue: https://git.jhax.dev:30300/LatentWorx-Beck/tracker/issues/27
related: [notes-27-article-page-benchmark.md]
files_to: LatentWorx-Beck/kerrigan-landing-page docs/plans/27-article-page-design.md
---

# Article page design — tracker 27 (https://git.jhax.dev:30300/LatentWorx-Beck/tracker/issues/27)

## Sources and owner calls

**Sources.**
- "Bench": `_scratch/notes-27-article-page-benchmark.md`.
- "Measured": the spoke's 2026-11-09 run (`measure/measure.json`, `measure-390.json`).
- File:line references are at `f149bc9`, which I read this session.
- Contrast: I computed every ratio this session with the WCAG 2.x relative-luminance formula.
- The repo has no `CLAUDE.md` or `AGENTS.md` at `f149bc9`.

**Owner calls (2026-11-09, recorded on the issue):**
- **A. Width:** about 800 px of text on a full desktop, about 80 characters a line; keep the sticky rail.
- **B. Colour:** cyan headings with a bar, plus *"we need more than just cyan. I want the green in there, maybe some additional colors. I want it to draw visually without looking loud."*
- **C. In brief:** yes. All six articles get one, and the three new summaries join the founder's read.

## 1. What a great article page does

| # | Principle | Source (bench) |
|---|---|---|
| P1 | Frame and measure are separate decisions; extra width goes to side rails | 9 of 10 pages; GOV.UK, MDN and Stripe Guides keep the measure at 1600 and 1920 |
| P2 | Lines of about 45–90 characters; line-height at least 1.5 | Butterick; Baymard; WCAG 1.4.8. Owner call A sets ~80 |
| P3 | Headings set off by space first: h2 at 1.3–1.6× body, more space above than below, at most three levels | NN/g, Smashing, Stripe Guides; Butterick |
| P4 | Answer first: a summary or "In brief" | NN/g inverted pyramid and long-form formatting |
| P5 | Formatting carries the scanner: meaningful headings, sparing bold lead-ins, lists, callouts | NN/g F-pattern, layer-cake, long-form formatting |
| P6 | Table of contents near the top. Sticky with the current section marked on desktop, collapsed or inline on phones, in a `<nav>` with a label | NN/g ToC; Wikipedia; MDN and Tailwind `aria-current`; GOV.UK |
| P7 | Every section linkable: a unique id and a visible self-link | NN/g ToC; MDN, Tailwind, Vercel, Stripe Guides |
| P8 | A way back up on long pages | NN/g ToC; GOV.UK's fixed "Contents" link |

## 2. Gap table

| Principle | Ours today (measured / file:line) | Target / change |
|---|---|---|
| P1 frame | Card 812 px at every width; text is 28.3% of 1920 and 37.8% of 1440 (measured; `design-system.css:1776,1784,1785`); `.section-container` caps at 1100 (`:233`) | Frame 1084 / 1113 / 1198 px at 1280 / 1440 / 1920; text at least 40% of 1920 |
| P2 line length | 540 px at 16 px, about 71 characters per line (cpl) (measured) | Body `clamp(17px, 12px + 0.469vw, 21px)`; column = 38 × body = 684 / 713 / 798 px; about 80 cpl |
| P3 delineation | h2 24 px, 24 px above and 12 below, a 1 px `#27272a` rule at **1.26:1** (`:1249-1260`) | h2 1.55em, 64 px above and 16 below, a 48×4 px bar |
| P3 colour | Headings white; cyan unused in the body; no green | Quiet three-hue system (§3.3) |
| P4 summary | "In brief" is an h2 in 2 articles (a `ul` in asam, an `ol` in levels-of-care `:25-29`), a bold line in 1 (`how-recovery-housing-works.md:21`), missing in 3 | `## In brief` in all six (piece C1); a CSS panel |
| P5 eye flow | No callout, footnote or table-header styling | Footnote-style disclaimer, table header, list markers, blockquote (CSS only) |
| P6 ToC | None | Sticky rail with scroll-spy at ≥1180; collapsed `<details>` below |
| P7 quick nav | Goldmark ids exist; no visible link | Heading self-links via a render hook scoped to `articles` |
| P8 back to top | None | "Back to top" in the rail; a fixed "Contents ↑" on phone |
| Phone 390 | First h2 at 1512 px; 41 cpl (measured) | ToC disclosure inside the first screen (top under 844 px); no horizontal scroll |

**Quick nav: self-links and the ToC; no jump links inside "In brief".** All six articles will have an "In brief". Its bullets are claims, not section titles, and they do not map one to one onto sections. The ToC sits right beside the panel on desktop and right above it on phone. A second set of links would duplicate it and add link colour to the passage the founder reads for claims. That is my judgment, not a sourced finding.

## 3. Design spec

### 3.1 Units (no em trap)

- `--article-fs: clamp(1.0625rem, 0.75rem + 0.46875vw, 1.3125rem)` is declared on `.article-shell`.
- `--article-measure: calc(38 * var(--article-fs))`. Both are rem and vw only, so they resolve the same in every element.
- `.article-layout` and `.article-content` set `font-size: var(--article-fs)`.
- 38 em at 0.475 em per character (540 px ÷ 16 px ÷ 71 cpl, measured) is about 80 cpl.

### 3.2 Layout grid

**Width budget.**
- Horizontal space outside the frame: `.legal-shell` padding of 24 px a side (`:1230-1234`), `.section-container` padding of 24 px a side (`:235`), and a scrollbar of about 12 px (measured 1908 at 1920). That is vw − 108.
- The frame is 38f + 96 (card padding) + 48 (gap) + 256 (rail) = 38f + 400.
- The frame fits when vw ≥ 1173. **The rail breakpoint is 1180 px.** At 1180 the frame is 1066 px against 1072 available.

| Viewport | Body f | Column | Card (padding) | Rail / gap | Frame (available) | Text share |
|---|---|---|---|---|---|---|
| 1920 | 21 px | 798 px | 894 (48) | 256 / 48 | 1198 (1812) | 41.6% |
| 1440 | 18.75 px | 713 px | 809 (48) | 256 / 48 | 1113 (1332) | 49.5% |
| 1280 | 18 px | 684 px | 780 (48) | 256 / 48 | 1084 (1172) | 53.4% |
| 1180 | 17.53 px | 666 px | 762 (48) | 256 / 48 | 1066 (1072) | — |
| 641–1179 | 17–17.53 px (17 below 1067) | 646–666 px, or less where the viewport is narrower | ≤730 (32), centred | inline `<details>` | single column | — |
| ≤640 | 17 px | viewport − 48 (342 at 390 with overlay scrollbars; 328 measured in a 390 frame with a 12 px scrollbar) | 16 / 12 (existing `:1815`) | inline `<details>` | — | — |

**Container.** In `single.html` the `<div class="section-container article-container">` also gets `article-layout`, so there is one wrapper.
- ≥1180: `.article-container` `max-width` goes from 860 px (`:1776`) to `calc(var(--article-measure) + 400px + 2 * var(--gutter-desktop))`. It is later in the file than `.section-container`'s 1100 (`:233`), so it wins.
- Below 1180: `calc(var(--article-measure) + 64px + 2 * var(--gutter-desktop))`.

**Grid areas.** Markup order: `<header class="article-head">` (back link, h1 `id="article-title"`, standfirst, meta), then `<nav class="article-toc">`, then `<div class="article-card">`, then `<p class="article-foot">` (the "All articles" button).
- ≥1180: `grid-template-columns: minmax(0, calc(var(--article-measure) + 96px)) 256px; column-gap: 48px; grid-template-areas: "head ." "body toc" "foot ."`. The ToC is sticky within the body row.
- Below 1180: one column, `head / toc / body / foot`.
- The rail is on the right, as in 4 of the bench's 5 sticky rails, so the text's left edge lines up with the title.

**Card padding** (set in S3): 48 px at ≥1180, 32 px from 641 to 1179, and 16/12 px at ≤640 (as now).

**Measure applies to text only:** `.article-content > :is(p,ul,ol,h2,h3,h4,blockquote,table) { max-width: var(--article-measure) }`.

### 3.3 Colour system: quiet, three hues

**Quiet rules:**
1. Neon tokens (`#00e5ff`, `#10b981`) only on non-text marks of 4 px or less, or as text only in 12 px labels.
2. Heading text uses pastel tints: 55% token and 45% white, which lowers chroma.
3. No coloured background fill above 6% alpha.
4. One accent hue per element.
5. Body paragraphs stay `#d4d4d8`.

**Hue roles:** cyan is structure and "where you are"; green is the summary and secondary structure; cobalt is interaction (links, unchanged), with cobalt-soft for quiet lines. New tokens go in `:root` next to `:15-117`: `--article-cyan-soft:#73f1ff`, `--article-green-soft:#7cd8ba`, `--article-cobalt-soft:#93bafa`.

| Element | Colour | Area | Contrast (bg) |
|---|---|---|---|
| h2 text | cyan-soft `#73f1ff` | heading | 14.03:1 (`#121215`) |
| h2 bar `::before`, 48×4 px | gradient `#00e5ff` → `#10b981` | 4 px | 12.16 / 7.37:1 (non-text, needs 3:1) |
| h3 text | green-soft `#7cd8ba` | heading | 11.03:1 |
| h4 text | `#ffffff` | — | 18.70:1 |
| Body | `#d4d4d8` | — | 12.65:1 |
| Links | `#3b82f6` (unchanged) | inline | 5.08:1 (`#121215`); 5.28:1 (`#0d0d10`) |
| Bold lead-ins | `#ffffff` | inline | 18.70:1 |
| Self-link `#` (hover/focus) | cyan-soft `#73f1ff` | glyph | 14.03:1 |
| Self-link focus ring | 2 px `#00e5ff` outline | 2 px | 12.16:1 |
| ul markers | cyan-soft | glyph | 14.03:1 |
| ol numbers | green-soft, Space Mono | glyph | 11.03:1 |
| In-brief panel | bg `#0d0d10`, 3 px `#10b981` left border | border | 7.65:1 |
| In-brief label (h2, Space Mono 12 px caps) | `#10b981` | 12 px label | 7.65:1 (`#0d0d10`) |
| In-brief text | `#d4d4d8` | — | 13.13:1 |
| ToC label (Space Mono 12 px caps) | `#a1a1aa` | label | 8.19:1 (`#000`) |
| ToC link (Inter 14 px fixed, not `--article-fs`) | `#a1a1aa`, hover `#fff` | — | 8.19 / 21:1 |
| ToC current | `#fff` with a 2 px `#00e5ff` left border | 2 px | 21 / 13.65:1 |
| Table header | bg `#0d0d10`, text `#fff`, 2 px cobalt-soft bottom border | 2 px | 19.41 / 9.84:1 |
| Blockquote | 3 px cobalt-soft left border, text `#d4d4d8` | 3 px | 9.48 / 12.65:1 |
| Disclaimer | `#a1a1aa`, 0.875em, 1 px `#27272a` top rule | — | 7.30:1 |
| Phone "Contents ↑" | bg `#0d0d10`, text `#fff`, 1 px `#00e5ff` border | 1 px | 19.41:1 |

**Rejected options:**

| Option | Why rejected |
|---|---|
| Neon cyan h2 text (`#00e5ff`, 12.16:1) | Loud |
| An 8% green tint on the card (`#121f1e`) | Links fall to 4.60:1 |
| Cobalt headings | Read as links |

Sections are not numbered (no bench page numbers them).

### 3.4 Headings and self-links

| Element | Font / size | Above / below |
|---|---|---|
| h2 | Space Grotesk 700, 1.55em, lh 1.2 | 64 px / 16 px, `padding-top: 20px` (bar at top left; the 1 px rule is removed) |
| h3 | Space Grotesk 600, 1.2em | 40 / 8 px |
| h4 | Inter 600, 1em | 24 / 4 px |

- **Fonts:** already loaded (`baseof.html:41`).
- **Hook:** `layouts/articles/_markup/render-heading.html` outputs `<hN id="{{.Anchor}}"><a class="heading-link" href="#{{.Anchor}}">{{.Text}}</a></hN>`. Hugo looks up `layouts/<section>/_markup/` first, so legal pages are untouched (gohugo.io lookup order). No heading contains a link (grep `^##.*\](` empty).
- **Link CSS:** `.article-content .heading-link { color: inherit; text-decoration: none }`. Its specificity (0,2,0) beats `.legal-content a` (0,1,1, `:1267`).
  - `.heading-link:is(:hover,:focus-visible)::after { content: "#" / ""; margin-left: .35em; color: var(--article-cyan-soft) }`.
  - `.heading-link:focus-visible { outline: 2px solid #00e5ff; outline-offset: 2px }`.
- **Scroll offset:** `scroll-margin-top: 96px` on h1 (the back-to-top target `#article-title`) and h2–h4. Phone nav is 69 px and desktop nav 77 px (measured).
  - `:root:has(.article-shell) { scroll-padding-top: 0 }` cancels the `scroll-padding-top: 80px` that `:1594-1597` sets at ≤768.
  - So a jumped-to heading lands 96 px down at every width, inside the 120 px scroll-spy line.

### 3.5 ToC

**Partial.** `layouts/partials/article-toc.html` walks `.Fragments.Headings` recursively and emits only `Level == 2`. The docs do not say how headings nest when there is no h1 (unverified), so the walk does not rely on it. It renders when there are at least 3 h2s. "In brief" is included.

**Markup:**
```
<nav class="article-toc" id="contents" aria-labelledby="toc-label">
  <details id="toc-details" open>
    <summary id="toc-label">On this page <span>(N sections)</span></summary>
    <ol>…</ol>
    <a class="toc-top" href="#article-title">Back to top</a>
  </details>
</nav>
```

**Inline script.** A sync inline `<script>` placed after `</nav>` sets `open = false` when `matchMedia('(max-width:1179px)')` matches. There is no CSP (`git grep -i content-security-policy` empty), and baseof already uses inline scripts (`:82`, `:181`).

**≥1180.**
- `position: sticky; top: 96px; align-self: start; max-height: calc(100vh - 120px); overflow-y: auto`.
- Text: label 12 px, links 14 px, line-height 1.4, list gap 6 px.
- The summary is a static label: no marker, `pointer-events: none`.
- JS sets `summary.tabIndex = -1`, forces `open`, and calls `preventDefault` on summary clicks. Without JS on desktop the summary stays focusable; acceptable degradation.

**Below 1180.**
- Collapsed: `#0d0d10` background, 1 px `#27272a` border.
- The summary is at least 44 px tall, 15 px, and focusable.

**`assets/js/article-toc.js`** (plain JS, no dependencies, about 60 lines). Loaded with `defer` via `resources.Get | minify | fingerprint` and `integrity`, the pattern at `finder.html:9,146`. It does four things:
1. **Scroll-spy**, throttled with requestAnimationFrame: the last h2 whose top is at most 120 px gets `aria-current="true"`.
2. **Breakpoint changes:** sets the summary state on each `matchMedia` change.
3. **Phone shortcut:** an IntersectionObserver on `#contents` shows `<a class="toc-fab" href="#contents">Contents ↑</a>` once the ToC has scrolled out of view.
   - Position: `position: fixed; right: 16px; bottom: calc(16px + env(safe-area-inset-bottom)); z-index: 90` (below `.site-nav` z-index 100, `:1111`).
   - Size: at least 44×44 px.
   - Visibility: hidden at ≥1180.
4. **Opens the list:** clicking `.toc-fab` or `.toc-top` opens the details.

Smooth scrolling applies only under `prefers-reduced-motion: no-preference`, scoped `:root:has(.article-shell)`.

### 3.6 In brief panel, footnote, tables

**In brief:** `h2#in-brief` and `h2#in-brief + :is(ul,ol)` render as one panel.
- **Shared:** background `#0d0d10`; `border-left: 3px solid #10b981`.
- **h2:** `margin: 64px 0 0; padding: 20px 24px 8px`, with no bar (`::before { content: none }`).
- **List:** `margin: 0 0 1em; padding: 0 24px 20px 48px`, so there is no gap between the two parts.

**Disclaimer:** `.article-content > p:last-child:has(> em:only-child)`. All six articles end that way.

**Tables:** keep the existing scroll cue (`:1804-1811`).

### 3.7 Sticky risk

`:155-157` sets `html, body { overflow-x: hidden; width: 100% }`. With `html` not `visible`, body's overflow does not propagate to the viewport. Body becomes a scroll container that never scrolls, and sticky children may stop sticking. That is my reading of the CSS overflow spec, unverified in a browser. The mid-page screenshot at 1440 shows no site nav, which hints that `.site-nav` (sticky, `:1109-1112`) is already broken.

- **S0 probe:** the `.site-nav` top after `scrollTo(0,3000)`.
- **Fallback:** `:root:has(.article-shell), :root:has(.article-shell) body { overflow-x: clip }`. It leaves legal and home pages untouched.

## 4. Acceptance

The harness is the spoke's geckodriver tool (`measure/tools/shoot.py`) plus a new `measure-article.js`. It runs from the executor's scratchpad against `hugo server --buildDrafts` on a local merge of the design branch and C1, and is not committed.

- [ ] **Hugo 0.161.1:** `docker build -f deploy/Dockerfile --target build .` exits 0.
- [ ] **Sticky probe (S0) recorded:** after the fix, the `.site-nav` top is 0 after `scrollTo(0,3000)` at 1440.
- [ ] **Width:** `.article-content > p` content-box width is 790–806 px at 1920, 705–720 at 1440 and 676–692 at 1280. `avgCharsPerLine` is 76–84 at all three. Text share at 1920 is at least 0.40.
- [ ] **Rail breakpoint:** at 1180 the rail is visible and there is no horizontal scroll. At 1179 the ToC is inline.
- [ ] **ToC entries equal the h2 count on all six:** every ToC `href` resolves to an id, and each link's rendered `textContent.trim()` equals the heading's `textContent.trim()`.
- [ ] **Scroll-spy:** after jumping to the 4th h2 at 1440 and at 390, exactly one link has `aria-current="true"`, and it is the 4th.
- [ ] **Sticky:** at 1440, after scrolling to 60% of the page, the `.article-toc` top is between 0 and 120 px.
- [ ] **Self-links:** every h2 and h3 in `.article-content` holds one `a.heading-link` with `href` equal to `#` plus its id. Its computed colour equals the heading's colour, with `text-decoration-line: none`.
- [ ] **Heading styles:**
  - h2 (except `#in-brief`, which follows the In-brief panel spec): `margin-top` 64px, `color` rgb(115, 241, 255).
  - The h2 `::before` bar: 48×4 px; the gradient runs from rgb(0, 229, 255) to rgb(16, 185, 129).
  - h3: `color` rgb(124, 216, 186).
- [ ] **Colour system:** every row in §3.3 has its computed colour. The executor recomputes each text ratio (at least 4.5:1) and each non-text ratio (at least 3:1).
- [ ] **Quiet rules:**
  - No element in `.article-shell` computes `color` to rgb(0, 229, 255) or rgb(16, 185, 129) unless its `font-size` is 12px.
  - No `background-color` has alpha above 0.06 with a max−min channel spread above 8, except `.toc-fab` and the In-brief panel, whose `#0d0d10` has a spread of 3.
- [ ] **In brief on all six:** `h2#in-brief` and `h2#in-brief + :is(ul,ol)` both have background rgb(13, 13, 16) and `border-left` 3px rgb(16, 185, 129). The list has `margin-top` 0, and the h2's bottom equals the list's top.
- [ ] **Disclaimer on all six:** the last paragraph has `color` rgb(161, 161, 170) and a 1px top border.
- [ ] **Back to top:**
  - At 1440, `.toc-top` is visible.
  - At 390, after `scrollTo(0,3000)`, `.toc-fab` is displayed with z-index 90.
  - Clicking it lands on `#contents` with `#toc-details.open === true`.
- [ ] **Phone 390×844:** `scrollWidth <= innerWidth`; `#toc-details.open === false` at load; the summary top is under 844; cpl is at least 38.
- [ ] **Keyboard:**
  - At 1440, Tab from the h1 never focuses the summary, and reaches every ToC link and every heading link, each with a visible focus ring.
  - At 390, the summary is focusable and Enter toggles it.
  - axe-core, if it can be injected: 0 serious or critical issues at 1440 and 390. Otherwise record it as "not run".
- [ ] **Text unchanged by the design branch:** the `.article-content` `textContent` of all six is byte-identical before and after on the same content. `git diff --stat <preview-head>...HEAD -- content/` is empty.
- [ ] **Legal pages unchanged:** `diff -r` of `public/legal/**` before and after differs only in the CSS fingerprint and integrity lines.
- [ ] **Screenshots:** before (`measure/shots/*`) and after at 1920, 1440, 1280 and 390, each as first screen and full page, linked in the PR body.
- [ ] **Owner checkpoint (S7) passed.**

## 5. Pieces

**Design branch.** `feat/27-article-page-design`, cut from `origin/content/articles-52-55-preview` (f149bc9). That branch owns the article CSS and `single.html` changes that main lacks (`git diff e0ea2f1 f149bc9`).
- The PR targets the preview branch, then is retargeted to `main` after the preview merges.
- Work in a **new** worktree in the executor's scratchpad, never one of the existing 20 (`git worktree list`).

| Step | Does | Files |
|---|---|---|
| S0 | Probe sticky on the current build (§3.7) and record the result; S3 adds the fallback if it fails | none |
| S1 | Add the heading render hook | `layouts/articles/_markup/render-heading.html` (new) |
| S2 | Add the ToC partial; restructure `single.html` into head / toc / card / foot with `article-layout` and `id="article-title"`; add the inline script | `layouts/partials/article-toc.html` (new), `layouts/articles/single.html` |
| S3 | Replace the ARTICLE PAGE CSS block: tokens, units, container, grid, card padding 48/32/16-12, headings, self-link, colour system, ToC (14 px), In-brief panel, disclaimer, tables, blockquote, `.toc-fab`, `scroll-padding-top` reset, and the S0 fallback if needed | `assets/css/design-system.css` (`:1773-1816` plus `:root` tokens; the repo-root copy is unused) |
| S4 | Add the ToC behaviour and load it from `single.html` | `assets/js/article-toc.js` (new), `layouts/articles/single.html` |
| S5 | Run §4 on a local merge with C1; take screenshots | none |
| S6 | Commit this plan; open the PR with a body that follows `.github/pull_request_template.md`, including its Site checks (the template says merging publishes the site) | `docs/plans/27-article-page-design.md` |
| S7 | Owner checkpoint: the hub shows the 1920 and 1440 first-screen and mid-page shots from the local preview; the owner confirms "wide enough, colourful enough, not loud" | none |

**Order:**
- S0 decides S3's fallback.
- S1's ids are what S2's links point to.
- S3 needs S2's markup.
- S4 needs S2 and S3.
- S7 gates the merge.

**S7 levers, pre-decided.** Each is a one-token change in S3.
- Width: 38 → 41 × body, about 860 px and 86 cpl at 1920. The rail breakpoint moves to 1240.
- Colour: three intensity steps.

| Step | Effect |
|---|---|
| −1 | h2 and h3 text white; bars and markers only |
| 0 | As specified |
| +1 | h2 text neon `#00e5ff` (12.16:1); this breaks quiet rule 1 on purpose |

**Content piece C1** (on `content/articles-52-55-preview`, ahead of the founder's six-article read):
1. **Write.** A writer drafts an `## In brief` with 2–4 bullets, placed after the intro paragraph, in `content/articles/ai-scribes-42-cfr-part-2.md`, `content/articles/icd-10-substance-use-codes-explained.md` and `content/articles/questions-to-ask-an-ai-scribe-vendor.md`.
   - Each bullet restates only a claim already in that article's body, with its strength unchanged: no hedge removed, no "our reading" dropped.
   - No new sources.
   - Links are allowed only where the body already cites the same URL for the same claim.
2. **Convert.** The writer changes `how-recovery-housing-works.md:21` from `**In brief**` to `## In brief`, wording unchanged.
3. **Check.** An independent checker (not the writer) returns a table: bullet | supporting body sentence (file:line) | same strength Y/N | new source Y/N. Pass means every row reads Y / N. Two command checks back it up:
   - `grep -c '^## In brief$'` returns 1 in each of the six files.
   - `git diff --word-diff` touches only the four In-brief blocks.
4. **Read.** The four changes then join the founder's read.

C1 is independent of the design branch. The panel only needs the `in-brief` id.

**Out of scope:** the article list page; the dev-site deploy (the hub pins dev); `hugo.toml`'s `tableOfContents`.

**Depends on:** the preview branch merging before this PR targets main; C1 for the In-brief box on all six.

**Risks:**

| Risk | Mitigation |
|---|---|
| Founder read | Text identity check and an empty `content/` diff on the design branch; C1 has its own checker and goes into the read |
| The preview branch moves | Rebase; conflicts can only arise in the CSS block or `single.html` |
| Shared dev site | No deploy in this piece |
| Hugo 0.168 locally vs 0.161.1 in CI | The Docker build-stage check |
| Sticky positioning broken site-wide | S0 probe plus the scoped `clip` fallback |

## 6. Calls (owner)

None open. Width (A), colour (B) and In brief (C) were decided on 2026-11-09. S7 is a look-and-confirm step with its levers already decided, not a new decision.
