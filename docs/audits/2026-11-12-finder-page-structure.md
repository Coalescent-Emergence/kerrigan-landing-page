# Audit: finder page frontend structure and layout safety nets

Date: 2026-11-12 · Tracker: [283](https://git.jhax.dev:30300/LatentWorx-Kerrigan/tracker/issues/283), [288](https://git.jhax.dev:30300/LatentWorx-Kerrigan/tracker/issues/288)

> The finder layout is built on arithmetic, not structure: the map stage's height is "window minus a
> guessed 170px" that silently encodes the heights of everything above it, so adding the sign-in row
> three days later pushed the map's controls off-screen, and nothing (no lint, no CI layout check,
> only a manual nav-link probe) was positioned to notice. Fix the shell once (grid rows, 1fr, min-height:0,
> dvh), then make the existing browser probe assert "controls are on screen" and run it in CI.

## Status 2026-11-13

Checked against `56d2dce` with git.

- The `calc(100vh - 170px)` map-stage height was removed in `d58bb6b` (tracker 283). `git log 56d2dce -S'170px' -- assets/css/finder.css` lists `d58bb6b` (removed) and `80cade6` (added).
- `scripts/finder-controls-check.mjs` exists, and `make controls-check` runs it. It was added in `d58bb6b` and strengthened in `f4c4f5e`. It did not run in CI at `56d2dce`: neither `.github/workflows/deploy.yml` nor `.gitea/workflows/image.yml` mentions it.
- The remaining items (consolidating `finder.css`, tokens for breakpoints and z-index, running the check in CI, the other findings below) are tracked on 288.
- The stale `main.css` paths in `docs/development.md` and `docs/architecture.md` are corrected in the PR that files this audit.

The findings below are the 2026-11-12 text, unchanged.


Checkout: `kerrigan-landing-page-wt-review` at 6445755. Paths are relative to it. "Judgment" = mine; "Sourced" = a URL fetched this session.

## Verdict

The code works and the state handling is sound (CSS reacts to `data-results`/`data-panel`/`data-view` attributes the JS sets, finder.js:810, 848, 1009). The layout is fragile because sizes that should be *derived by layout* are *typed in as numbers*, and the stylesheet grows by appending override blocks instead of editing the original rule. A small markup change cannot be judged safe by reading, and no check runs that would show it.

**The three things that matter most**

1. **Subtraction instead of structure.** `.finder-stage { height: calc(100vh - 170px); min-height: 560px }` (finder.css:443). The 170px was set in 80cade6 (2026-11-06, `git log -S`). The sign-in row was added above the stage in b840951 (2026-11-09, "wip … unfinished"). 170 was never updated. The stage now starts at 260px, so it overflows by 90px (incident measurements). The `min-height: 560px` means any window shorter than about 820px overflows even with a correct number (judgment: 260 + 560).
2. **Append-only CSS.** 48 of the 272 selectors in finder.css are defined in more than one rule block (a parse of the file this session). Nine blocks are labelled "tracker 267" and stack on top of each other. One override silently cancels a phone rule (finding B1).
3. **No layout safety net.** CI only builds (.gitea/workflows/image.yml, .github/workflows/deploy.yml). There is no stylelint and no package.json. The one browser check (scripts/finder-nav-check.mjs) tests only that nav links are visible, at 1400×900 and 375×800 (lines 23, 44). It runs by hand (Makefile:41).

**Ranked recommendations**

| # | What | Would it have caught or prevented this? | Effort | Kind | Basis |
|---|---|---|---|---|---|
| 1 | Extend finder-nav-check into a layout check. Assert that `.finder-stage` bottom ≤ `innerHeight` and that `.finder-basemaps`, `#finder-results-toggle`, and `#finder-area` (forced visible) are in the viewport and topmost. Run at 1280×720, 1440×900, 1920×1080, 900×800 and 375×667 | Yes. It fails on b840951 at every desktop size | 2–3 h | standing check | judgment |
| 2 | Run that check in Gitea CI on every push (hugo server + Firefox + geckodriver, all free). Block merge on failure | Yes, before merge, with no one remembering to run it | 3–5 h | standing CI | judgment |
| 3 | Rebuild the ≥1024px page as an app shell: `.finder` becomes `display:grid; grid-template-rows:auto auto auto 1fr; height:100dvh` (nav inside or accounted for), stage `min-height:0`, drop the `calc` and the 560px floor | Prevents the whole class: a new row takes space from the map instead of pushing it out | 3–6 h | one-off | sourced (web.dev pancake stack, Defensive CSS, MDN units) |
| 4 | Add stylelint with `stylelint-config-recommended` in CI (it includes `no-duplicate-selectors` and `no-descending-specificity`). Add a ban on `vh` in height declarations in favour of `dvh`/`svh`, and a ban on `!important` | Partly. It flags 156 vs 392 (which caused B1). It would not flag the 170px | 1–2 h, plus 2–4 h clearing existing hits | standing lint | sourced (rule list); config shape is judgment |
| 5 | Put the overlay geometry in custom properties on `.finder-stage` (`--finder-inset`, `--finder-bar-h`, `--finder-list-w`, `--finder-panel-w`). Derive every offset from them and have JS read them via `getComputedStyle` instead of the literals 84/392/372 | Prevents the sibling bugs in table A | 1–2 h | one-off | judgment |
| 6 | Consolidate finder.css: one block per component, with its breakpoints next to it, and delete overridden declarations. Optionally split by component (stage, filters, results, dialogs) and order them with `@layer` | Makes the next override visible at the place it is written | 4–6 h | one-off | `@layer` sourced (MDN); split is judgment |
| 7 | Add a z-index scale as tokens in design-system.css. Make the filter drawer a `<dialog>` (top layer) instead of z-index 1100 | Low direct effect; it removes guesswork when overlays are added | 1–2 h | one-off | judgment |
| 8 | Write an ADR: "finder is an app shell at ≥1024; what lives in the shell; breakpoints 768/1024 shared with finder.js". Fix stale docs. Make "controls on screen" an explicit PR-template line for layout PRs | The rule would have been written down for the sign-in change to violate visibly | 1 h | practice | judgment |

**Earliest and cheapest catch:** #1 run on the sign-in branch. The harness already exists (81 lines). It needs one more probe and three more window sizes.

## Standards question: "the main container should be max the viewport"

**Partly right.** The principle is current practice: bound the shell to the viewport. How you bound it matters:

- **Use layout, not arithmetic.** Rows sized by content (`auto`) plus one row that takes "the remaining space (`1fr`)" is the web.dev "pancake stack" (https://web.dev/articles/one-line-layouts). Flex and grid children default to `min-height:auto`. A column child holding a map needs `min-height: 0` or it refuses to shrink (https://defensivecss.dev/tip/flexbox-min-content-size/). MapLibre's own full-window example is just `html, body, #map { height: 100% }` (https://maplibre.org/maplibre-gl-js/docs/examples/display-a-map/).
- **`max-height` on `<main>` is the wrong lever.** It only clips the box or makes it scroll inside. The map still has no defined height to fill. What you need is an exact height on the shell and a `1fr` row for the stage (judgment).
- **Units.** `vh` equals `lvh`, the *large* viewport, with the browser's toolbars retracted (MDN https://developer.mozilla.org/en-US/docs/Web/CSS/length; W3C https://www.w3.org/TR/css-values-4/#viewport-relative-lengths). So `100vh` "on mobile is too tall on load" (https://web.dev/blog/viewport-units). `svh` is "safer" but stable. `dvh` tracks the toolbars but "can cause the content to resize while a user is scrolling" (MDN). For an app shell that never scrolls as a page, `100dvh` with `100vh` as a fallback is the usual choice (judgment; the sota layout guide says the same). On desktop, `vh` was not this bug: the 170px constant was. I believe desktop browsers have no retractable toolbars, so large = small there (unverified).
- **Sticky header.** If the nav sits inside the grid as an `auto` row, no other element needs to know its height. That removes `top:80px`, `-140px` and `-170px` together (judgment).

The open product point is in OPEN: the shell has no room for the below-stage content (`.finder-signup`, finder.html:357).

## A. Hard-coded offsets that mirror another element's size

| Where | Mirrors | Risk if the other element changes |
|---|---|---|
| finder.css:443 `100vh - 170px`, `min-height:560px` | nav + header (+ slack) | **The incident.** Any new row above the stage overflows it |
| :158 `top:80px` (768–1023, and phones via B1) | nav height (77 measured) | A taller nav covers the map top |
| :164 and :357 `100vh - 140px` (same literal twice) | nav + basemap row | Map or list bottom runs off-screen at 768–1023. That band is not tested |
| :448, :450, :455, :462 `top:84px`; finder.js:799 `top:84` | filter bar height + 10px inset | The bar wraps (`flex-wrap`, :325–326) or collapses (:470), and the list or panel overlaps it or leaves a gap |
| :453 `top:96px; left:400px` | list width 380 + 10 + 10 | Resizing the list strands the toggle |
| :463 `right:372px`; finder.js:799 `372`, `392` | panel 360 + inset + border | Map controls end up under the panel. The same numbers live in two languages |
| :452 `translateX(calc(-100% - 20px))` | the list's 10px inset ×2 | A partial list stays visible |
| :461 `.finder-area bottom:58px` | basemaps bottom 10 + height 40 + 8 | If the basemaps wrap (5 buttons), they overlap the area button |
| :391 `bottom:44px` (<1024) | unknown (unverified: map attribution?) | Undocumented |
| :556 `margin-top:36px` (≤480) | nav tab 32px + border, site-nav.html:11 | The tab covers the title if the nav changes |

**Pinned controls that depend on the stage's assumed height:** the list `bottom:10px` (:450), panel (:455), basemaps (:459) and area button (:461). Measurements put the stage bottom 90px below the window, so the bottoms of the list and panel are also below it (inference, not measured). Separately, the list has `overscroll-behavior: contain` (:357), so the wheel over the list does not scroll the page. Together with the map capturing the wheel, the page can scroll only from the strip above the stage (inference, unverified).

## B. Later rules overriding earlier ones (same selector)

| Selector: lines | Risk |
|---|---|
| **B1** `.finder-mapwrap`: 156 sticky, 257 static (phone), **392 sticky** (top level, later, same specificity), 445 absolute | 392 cancels the phone rule. Phones get `sticky; top:80px` when the phone block says static. The effect on the area button is unverified |
| `.finder-form`: 52 grid → 294 block → 323 border 0. The class is also on the **sign-in** form (finder.html:25), so 96, 324 (`[hidden]` `!important`) and others apply there, and 523 re-overrides | Editing the search form's styles also changes the sign-in row |
| `.finder-row`: 60 is meant for form rows, but no template uses it (grep). It still styles the results button (finder.js:758), then 365 and 508 override | A name collision. A dead rule leaks `grid-column`/`flex-wrap` onto results |
| `.finder-filters` 37 → 322 (undoes the border and background) → 447 | Three answers to one question |
| `.finder-item` 183/362/378; `.is-active` 191 adds a shadow, 364 removes it | Fix one block and another one wins |
| `.finder-list` ×6 (153, 357, 358, 410, 450, 478); `.finder-area` 172/391/461; `.finder-map` 161/258/446; `.finder-error` 137/431/448 | To know the final value you must read the whole file |
| 7 `!important` (grep -c) | Breaks the source-order reasoning the file already depends on |

## C. Ease of reasoning

- **Size and organisation.** finder.css is 556 lines with no component order. Rules sit in layers in the order tickets added them (sections at :263, :293, :321, :346, :353, :360, :375, :419, :506, all "tracker 267"). Many lines carry 10+ declarations (e.g. :450, :453). finder.js is 1,851 lines in one IIFE (an immediately invoked function), with 106 inner functions and 18 section banners (grep). That size is fine for vanilla JS, but it is one file.
- **Breakpoints.** finder.css uses 480, 767.98, 900 and min-1024. JS repeats 1024 (finder.js:793) and 767.98 (:1006) as literals. design-system.css uses 560, 768 and max-1024 (the max-1024 query overlaps min-1024 at exactly 1024px; it touches only non-finder classes). There are three layouts (<768, 768–1023, ≥1024). The check tests none of the middle band.
- **z-index.** finder.css has 11 ad-hoc values from 1 to 1100. The nav is 100 (design-system.css:1112). There is no scale and no tokens. MapLibre's own control z-index is unverified.
- **JS–CSS coupling.** Good: state lives in attributes, and finder.js:869 measures `offsetHeight` instead of assuming it. Bad: the geometry literals (finder.js:799–805) must match CSS by hand, and no comment links them.
- **Tokens.** Colours and spacing use tokens. Layout dimensions (nav height, bar height, panel widths) have none. site-nav.html:11 hard-codes `rgba(16,185,129,…)` inline.
- **Docs.** docs/development.md:70 and docs/architecture.md:49 point to `main.css`, and `static/css` does not exist (ls). docs/decisions has only 0001, with no finder layout ADR. development.md:99 requires a piece plan for "Layout restructure". Whether one exists for 267 or 251 is unverified. The PR template's only layout guard is the manual box "checked in a browser at desktop and phone width".

## D. Checks that exist vs. what they miss

| Check | Covers | Misses |
|---|---|---|
| finder-nav-check.mjs | nav links visible and topmost; phone sideways scroll | every finder control, stage fit, 768–1023, short windows; not in CI |
| image.yml / deploy.yml | Hugo builds | any CSS/JS correctness, layout |
| PR template | manual browser look | nothing enforced |
