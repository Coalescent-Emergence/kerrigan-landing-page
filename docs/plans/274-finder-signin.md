Plan of record for https://git.jhax.dev:30300/LatentWorx-Kerrigan/tracker/issues/274 — planning only, no code on this branch; the Kerrigan and kerrUI PRs link here.
# Finder sign-in holds across tabs and restarts, ends on the server, and has three more ways in — Finder sign-in is lost on returning to the finder page (https://git.jhax.dev:30300/LatentWorx-Kerrigan/tracker/issues/274)

**Home and trunk heads.** This plan lives in the landing page repo; every Kerrigan and kerrUI PR links it by its landing-page URL. Trunk heads read 2026-11-18 (`git fetch`, `origin/HEAD`): landing `0efb762`, Kerrigan `b6fdc40`, kerrUI `00f4d9a`, kerr-finder `79c2ced`, lwx-infra `b3042c9`. 150 of the file:line citations below were re-read at these heads on 2026-11-18 (`git show origin/<trunk>:<file> | sed -n '<line>p'`), and the round-10 corrections were re-read the same way; the rest were read in earlier rounds the same day.

**Order: P3 → P1 → P2 → P4 → P5.** P3 first, because a finder cookie can be renewed by script on *any* latentworx.com page. One branch per repo per piece; the backend ships first. P1 starts only after the P3 live gate passes.

## Repro for the issue
Run live 2026-11-18 in headless Firefox 159, geckodriver 0.36.0 (em-medina flake pin).
1. Open `https://latentworx.com/finder/` in tab A. The sign-in box shows.
2. Put a sign-in where the page keeps it, `sessionStorage['finder.session']` (`assets/js/finder.js:331-352` @0efb762).
3. Open tab B on the same page: `{"signedin":"hidden","signin":"shown","stored":null}`. A browser restart drops it the same way.
4. Sign-out never reaches the server: the live script `finder.min.19c0f477….js` contains no `api/auth/logout`.

## Design

### Facts (read or probed 2026-11-18)
**Hosts.** `latentworx.com` is GitHub Pages (dig 185.199.108–111.153; `server: GitHub.com`) and cannot set headers or cookies. `ui.` and `api.latentworx.com` are behind Cloudflare. Dev is `landing.`, `ui.`, `api.jhax.dev`. All pairs are same-site, cross-origin.

**Headers.** Traefik CORS uses an exact origin list with credentials (lwx-infra `manifests/kerrigan/base/traefik-middleware.yaml:31-40`, which lists `https://ui.latentworx.com` and `https://latentworx.com`); a preflight from `https://evil.example` or `https://x.latentworx.com` gets no `allow-origin`. No CSP, COOP or Referrer-Policy on the finder or the app (curl). The app is nginx (kerrUI `deploy/nginx.conf:1-37`).

**Pins (lwx-infra @b3042c9).**
- Backend, prod: `manifests/kerrigan/base/kustomization.yaml:163-166`. The gpu overlay carries no `images:` or `components:` (grep). Its backend env patch is the first entry under `patches:` (`overlays/gpu/kustomization.yaml:87`), `:96-125`, with the env list at `:109-125`.
- Backend, dev: the Component `manifests/kerrigan/overlays/dev/pins/kerrigan/kustomization.yaml:3-8`, pulled in by `components: - pins/kerrigan` at `overlays/dev/kustomization.yaml:1317-1318`; its header names the tracker 240 auto-pin bot as owner (`:1-2`). Dev's render ignores base's backend pin.
- kerrUI, prod: inline `image:` at `manifests/kerrigan/base/ui.yaml:384`. kerrUI, dev: shadowed by `images:` at `overlays/dev/kustomization.yaml:1319-1325`.
- Kerrigan `image.yml` builds on push to `main` and on `workflow_dispatch` (`.gitea/workflows/image.yml:15-19`).
- Runbook `docs/runbooks/kerrigan-deploy.md:169-174` still describes a dev pre-merge `images:` block in `overlays/dev/kustomization.yaml`; that is stale (follow-up).

**The app's session is the parity bar.**
- Link redeem (`magic_link_handlers.go:402`) accepts `magic_link` and `signup_welcome` tokens (`:391-396`) and calls `IssueSessionForUser` (`auth_service.go:490-502`): no MFA or role check, only `ensureActiveUser`, then the standard refresh token (168h, `config.go:503`), which kerrUI keeps in `localStorage['kerrigan_auth']` with `email`, `accessToken`, `refreshToken`, `role` (`useKerriganAuth.ts:9`, `:18-25`). Every account class, staff, MFA and pilot included, gets a 7-day session from a link today.
- The app has no TOTP entry: `login(email, password)` posts only those two fields (kerrUI `useKerriganAuth.ts:233-239`; `git grep -i mfa_token origin/main -- src` in kerrUI finds nothing). For MFA accounts and pilot-named accounts that are not enrolled (`auth_service.go:259-262`), the emailed link is the app's only working sign-in.
- P1's persistent link session therefore meets the owner's decision for every account class, these included.
- kerrUI's `AuthProvider` wraps the router (`App.tsx:606-617`) and runs `useKerriganAuth` (`contexts/AuthContext.tsx:3`, `:18`), whose refresh paths rotate the refresh token (`src/lib/api.ts:264-268`, `:292-303`). Its logout swallows a failed backend call (`useKerriganAuth.ts:191-193`).

**Today's auth code.**
- The finder keeps both tokens in sessionStorage (`finder.js:331-352`); redeem saves both (`:1577-1579`); sign-out is local only (`:1593-1601`); it refreshes only after a 401 (`refreshSession` at `:459-475`, called on a 401 at `:381` and `:490`).
- Body refresh deletes the row (`GetAndDeleteRefreshToken`, `user_repository.go:251-278`, `DELETE … RETURNING`, called at `auth_service.go:352`) and re-inserts it on the same `token_id` (`CreateRefreshToken` upsert, `user_repository.go:177-200`, called at `auth_service.go:633` inside `issueTokensWithSessionID`, invoked at `:369`). The two statements run in one request but not in one transaction, with `GetUserByID` (`:361`), `ensureActiveUser` and the role lookup (`:596`) between them. So a foreign key with `ON DELETE CASCADE` onto an app row would fire on every app refresh. Any refresh-token holder can mint a full session there today.
- Every new session (not a rotation) first runs `PurgeExpiredRefreshTokens` and `PruneUserSessions(…, 10)` inside `issueTokensWithSessionID` (`auth_service.go:590-594`), before the row is written; prune keeps the user's 10 most recently active rows of any kind (`user_repository.go:309-314`).
- App logout is `AuthService.Logout` (`auth_service.go:373-389`), whose only repo call is `DeleteRefreshToken` (`:383`; `user_repository.go:280-297`, `DELETE … WHERE token_id = $1 AND user_id = $2` at `:283`, no other caller). Expiry purge (`:300-301`) and prune also delete app rows. Session check: `TouchRefreshToken` (`auth_service.go:428-431`).
- `UserRepo` is declared at `user_repository.go:15-42`; its fakes live in `internal/service/auth_service_test.go` and `internal/api/handlers/subscribe_handlers_test.go` (`git grep -l GetAndDeleteRefreshToken`). `AuthTokenRepo` is declared at `auth_token_repo.go:22-47`; its select list is `authTokenColumns` (`:61-63`); the row type is `models.AuthToken` (`internal/models/authtoken.go:33`).
- `token.Service.Issue(ctx, purpose, userID, signupID, email, ttl)` (`internal/service/token/token.go:117-124`) is declared in three interfaces (`token.go:77`, `magic_link_handlers.go:30`, `signup/service.go:150`) and called at `magic_link_handlers.go:231` and `signup/service.go:918`, `:944`, `:1012`.
- Every session is minted by `issueTokensWithSessionID` (`auth_service.go:585-635`): it resolves the role (`:596`, `resolveUserRole` at `:659`), signs the JWT with `user_id`, `session_id`, `role`, `iat`, `exp` (`:602-611`), and builds a `models.RefreshToken` from `SessionMetadata{UserAgent, IPAddress}` (`:32-35`, `:623-633`). `session_id` is that row's `token_id` (`:604`, `:624`).
- Password login enforces MFA with three `errors.New` strings (`auth_service.go:258-271`: `:262` not set up, `:265` `mfa_token is required`, `:269` invalid); the handler writes `err.Error()` as a 401 (`handlers/auth.go:98-100`); `docs/api/agent-report-reader.md:137` documents those strings.
- The app origin is configured as `AppBaseURL` (`config.go:203-209`, validated by `validateAppBaseURL`; used for links at `magic_link_handlers.go:271`).
- `ListUserAssignments` returns revoked rows too (`iam_repo.go:238-256`); active-only queries filter `revoked_at IS NULL` (`:145`, `:166`). `Consume` has no purpose filter (`auth_token_repo.go:138-151`). `auth_tokens` is created at `000025_registration_flow.up.sql:90-101`. Link TTL 30 min (`magic_link_handlers.go:100-101`). Access JWT 15 min (`config.go:502`). One backend replica (lwx-infra `manifests/kerrigan/base/apps.yaml:9`).
- Live tests: repository tests use `liveDB` (`internal/repository/note_export_live_test.go:27`); `internal/service` live tests read `KERRIGAN_TEST_DATABASE_URL` inline (`internal/service/final_record_origin_live_test.go:25-28`), with no shared helper.

**Landing scripts** (`layouts/_default/baseof.html` @0efb762). Production builds with `HUGO_PARAMS_ANALYTICSENABLED=true` and `POSTHOGKEY`, and without `--buildDrafts` (`.github/workflows/deploy.yml:42-52`). The home page, `/articles/ai-scribes-42-cfr-part-2/` and `/finder/` each serve 3 inline scripts (curl). `git grep '<script' origin/main -- layouts content static` finds every script tag; content and static have none. The only carousel page, `content/product-demo/index.md`, is `draft: true` (`:4`) and `https://latentworx.com/product-demo/` answers 404 (curl); no content page uses the `video` shortcode (grep). `.gitignore` ignores `public/` (`:1`) but not `public-csp/`.

### P3: script integrity, site-wide (ships first)

**Every inline script, and what it becomes.** Each new file is a Hugo asset under `assets/js/`, `resources.Get | minify | fingerprint`, loaded with `integrity="{{ .Data.Integrity }}"` as `design-system.css` already is (`baseof.html:49-51`), in the same position and order as today. Templated values move to `data-` attributes on the script's own tag, read through `document.currentScript.dataset`.

| Where (@0efb762) | Today | Becomes |
|---|---|---|
| `baseof.html:56-64` | PostHog stub loader; `posthog.init('{{ . }}', {api_host: '{{ posthogHost }}'})` | `assets/js/vendor/posthog-<pinned>.no-external.js` (`resources.Get | fingerprint`, not re-minified), then `assets/js/posthog-init.js` with `data-posthog-key`, `data-posthog-host`; init adds `disable_external_dependency_loading: true` (https://posthog.com/docs/libraries/js/security) |
| `baseof.html:68-74` (if `ga4MeasurementId`; empty, `hugo.toml:50`) | external gtag + inline `gtag('config','{{ . }}')` | `assets/js/ga4-init.js`, `data-ga4-id` |
| `baseof.html:78-84` (if `clarityProjectId`; empty, `hugo.toml:49`) | inline loader with `"{{ . }}"` | `assets/js/clarity-init.js`, `data-clarity-id` |
| `baseof.html:87-178` | event tracking, access-form wiring; no templated values | `assets/js/analytics.js` |
| `baseof.html:186-277` | first-touch attribution; `SIGNUP_URL = {{ .Site.Params.signupUrl }}` at `:252` | `assets/js/attribution.js`, `data-signup-url` |
| `shortcodes/video.html:21-34` | YouTube facade click handler, once per page (`:19-20` Store guard); no templated values | `assets/js/video-facade.js`, same Store guard |
| `shortcodes/productcarousel.html:86-107` | carousel, `getElementById('{{ $id }}')`, `$id` from `now.UnixNano` (`:2`, `:88`), emitted per instance | `assets/js/product-carousel.js` initialising every `[data-carousel]` root (`:47` carries it), behind a `$.Page.Store` guard like `video.html:19-20`. `$id` becomes `{{ $.Page.Store.Add "carouselN" 1 }}{{ $id := printf "pc-%v" ($.Page.Store.Get "carouselN") }}`: Add sets a missing key, then adds with `+`; Get returns the value (https://gohugo.io/methods/page/store/) |

`partials/jsonld.html:15,36,47` stay: `application/ld+json` is a data block, which CSP does not execute.

PostHog self-hosting loses remote config, surveys, session recording and the toolbar; the site calls only `init`, `capture` and `identify` (`baseof.html:58`, `:99-100`, `:164-166`). Hashes instead of external files were rejected: the key is injected per build (`deploy.yml:47`).

**CSP.** `partials/csp.html`, a `<meta http-equiv>` in `baseof.html` before every script, on every page, built from params:

| Directive | Sources | Source |
|---|---|---|
| `script-src` | `'self'`, `https://cdn.jsdelivr.net/npm/maplibre-gl@5.24.0/dist/maplibre-gl.js` | `finder.html:376` |
| `connect-src` | `'self'` (virginia.geojson) | `finder.js:1819`, `finder.html:20` |
| | `finderApiBase`, `kerrApiBase` origins: prod `https://api.latentworx.com`; dev `https://api.jhax.dev`; stub `http://127.0.0.1:1314` | `hugo.toml:40-41`, `deploy/finder-dev.toml:7-8`, `deploy/finder-stub.toml:5-6` |
| | `posthogHost` `https://us.i.posthog.com` | `hugo.toml:48` |
| | `https://tiles.openfreemap.org`, `https://basemap.nationalmap.gov` | `finder.js:30-38`, `:1835` |
| `worker-src` | `blob:` (MapLibre) | |
| `frame-src` | `https://www.youtube-nocookie.com` | `shortcodes/video.html:26` |
| `object-src` / `base-uri` | `'none'` / `'self'` | |

- Styles and images stay open (jsdelivr and Google Fonts: `finder.html:15`, `baseof.html:44-46`).
- GA4 and Clarity hosts are not in the CSP: `csp.html` calls `errorf` when either id is set, so enabling one fails the build until its sources are added, instead of being silently blocked.
- A meta CSP cannot carry `frame-ancestors`, `report-uri` or `sandbox` (CSP3 §3.3, https://www.w3.org/TR/CSP3/), so the finder hides its sign-in controls when `window.top !== window.self`.

**The check, `scripts/finder-csp-check.mjs`.**
- **Runtime.** It starts by asserting `typeof WebSocket === "function"` and exits 1 otherwise. CI pins Node 22 with `actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0`, the newest release whose `action.yml` runs on `node20` (v5.0.0 onward run on `node24`; `gh api repos/actions/setup-node/contents/action.yml?ref=<tag>`, 2026-11-18), added to `finder-check.yml` after checkout (`:29`).
- **Listener before parse.** The session is created with `webSocketUrl: true` (geckodriver BiDi, Bug 1693004) and registers `script.addPreloadScript`, which runs before a document's own scripts (MDN https://developer.mozilla.org/en-US/docs/Web/WebDriver/Reference/BiDi/Modules/script/addPreloadScript; Firefox 112, https://bugzilla.mozilla.org/show_bug.cgi?id=1806420). It pushes every `securitypolicyviolation` into `window.__cspv`. Existing checks drive geckodriver over plain HTTP (`scripts/finder-nav-check.mjs:40-55`); this one adds the BiDi socket.
- **Positive control, run first in both modes.** `scripts/fixtures/csp-violation.html` carries the same CSP meta and one inline script. The check must record ≥1 violation on it; 0 → exit 1, `FAIL: control did not trip`.
- **Per page:** the CSP meta, containing `https://api.latentworx.com`, precedes the first script; PostHog loads from a fingerprinted `/js/vendor/` URL with `integrity`; 0 `script:not([src]):not([type="application/json"]):not([type="application/ld+json"])`; 0 entries in `__cspv` after load, with the map rendered on `/finder/`.
- **Shortcode fixture, build mode only, never shipped.** `content/csp-fixture/index.md` (`draft: true`) holds one `{{< video youtube="…" poster="/img/og-kerrigan.png" >}}` and two `{{< productcarousel >}}`. Only the csp-check build passes `--buildDrafts`, into `public-csp/` (added to `.gitignore`); the deploy build has no `--buildDrafts` (`deploy.yml:49-52`). `make csp-check` then runs the normal `hugo --gc --minify` into `public/` and asserts `test ! -e public/csp-fixture`. On the fixture it asserts one script tag per shortcode kind, carousel ids `pc-1`, `pc-2` in two consecutive builds, and 0 violations after clicking the video facade.
- **Headless WebGL fallback, build and live.** If the map canvas has no WebGL context, the check asserts that the style, tile and `blob:` worker requests appear in `performance.getEntries()` and that `__cspv` is still 0. unverified: whether headless Firefox on the CI runner has WebGL.

### Token storage (P1)
| Option | XSS / third-party script | Stolen device | Leaked refresh token |
|---|---|---|---|
| sessionStorage / localStorage (today) | reads the refresh token: a 7-day sliding takeover | localStorage persists | usable until it rotates |
| **httpOnly cookie + memory token** | script on any same-site page can call `web/refresh` while the cookie lives (P3 limits which script runs) but cannot carry the token away | cookie persists | unreadable by JS; reuse kills the session |
| BFF | — | — | not possible on GitHub Pages |

**Cookie.** `__Host-kerr_web`: `Path=/`, no Domain, `HttpOnly`, `Secure`, `SameSite=Strict`, `Max-Age` = `REFRESH_TOKEN_DURATION`. Only web-session calls use `credentials:'include'`; others keep `'omit'` (`finder.js:447`, `:488`).

**Routes.** Web mode is a separate path family, `/api/auth/web/*`, not a body flag, so one prefix carries the guard and the cookie: `redeem` (link), `refresh`, `logout`, `code-redeem` (P2), `login` (P4), `handoff-redeem` (P5). Each requires `SameSite=Strict`, an exact Origin from `WEB_SESSION_ORIGINS`, and `Content-Type: application/json` via `decodeSignupJSON`, which answers anything else with 415 (`signup_handlers.go:394-400`). Mounted only when `WEB_SESSION_ORIGINS` is set. `/web/redeem` accepts the same purposes as `MagicLinkRedeem`, `magic_link` and `signup_welcome` (`magic_link_handlers.go:391-396`), for parity.

**Writing `web_minted_by`.** `SessionMetadata` gains two fields, and `issueTokensWithSessionID` copies them into the row it already builds (`auth_service.go:623-633`); `CreateRefreshToken` (`user_repository.go:177-200`) inserts both columns and leaves them out of its `ON CONFLICT … DO UPDATE` (`:186-191`), so rotation on the same id keeps them.
```go
type SessionMetadata struct {
	UserAgent     *string
	IPAddress     *string
	WebMintedBy   *string    // nil for app sessions; "link" | "code" | "password" | "handoff"
	ParentTokenID *uuid.UUID // set only for "handoff": the app session it came from
}
// models.RefreshToken gains WebMintedBy *string and ParentTokenID *uuid.UUID.
```

**Access JWT for web rotation.** `/web/refresh` rows 1 and 3 need a JWT without a new refresh row. The claim building at `auth_service.go:596-613` moves into a private `signAccess(ctx, user, sessionID)` that `issueTokensWithSessionID` and the new method both call:
```go
// MintAccessForSession signs an access JWT for an existing session. It loads the
// user, runs ensureActiveUser and resolveUserRole, and creates no refresh row.
func (s *AuthService) MintAccessForSession(ctx context.Context, sessionID, userID uuid.UUID) (accessToken string, role string, err error)
```

**Incoming cookies.** Every mint route (`redeem`, `code-redeem`, `login`, `handoff-redeem`) runs `dropIncomingSessions` only **after** a successful mint, deleting the incoming cookie's session before setting the new cookie. A failed code, password or token leaves the incoming session intact. Two cookies on any web request → every presented row deleted, cookie cleared, 401 on non-mint routes. The mint's own prune-to-10 (`auth_service.go:590-594`) runs first, so the incoming row still counts toward that one prune; it is gone right after, so it never counts again.

**Prune can end a handoff session.** A web mint is a new session, so its prune keeps the user's 10 most recently active rows. A user with ≥10 more recently active sessions loses the oldest, which can be a handoff parent; that child is then refused at its next refresh (parent check).

**Body refresh refuses web rows; app rows behave as today.** `GetAndDeleteRefreshToken` (`user_repository.go:251-278`) adds `AND web_minted_by IS NULL` to its existing `DELETE … RETURNING` (`:256-259`), so app rows rotate exactly as now. On no match it runs `DELETE FROM refresh_tokens WHERE token_hash = $1 AND web_minted_by IS NOT NULL` and returns `ErrNotFound` (401). JS cannot read the cookie, so a cookie value here is always stolen; this keeps it from rotating outside reuse detection.

**Read-only app-row lookup (P5).** Added to `UserRepo` and to both fakes (`auth_service_test.go`, `subscribe_handlers_test.go`):
```go
// GetLiveAppRefreshRow returns the session for a live app refresh token:
// expires_at > now() AND web_minted_by IS NULL. Read-only: no delete, no lock.
GetLiveAppRefreshRow(ctx context.Context, tokenHash string) (tokenID, userID uuid.UUID, err error) // ErrNotFound on miss
```

**Browsers.** Headless Firefox sent a `Secure`, `SameSite=Strict` cookie cross-port over `http://127.0.0.1` (probe). unverified: `__Host-` on loopback; session-check tests it first. Safari: first-party subdomains are uncapped (https://webkit.org/blog/11338/cname-cloaking-and-bounce-tracking-defense/); the 7-day third-party-IP cap (https://bugs.webkit.org/show_bug.cgi?id=247865) equals the server lifetime.

### Who gets a session, by path
| Path | Session | `web_minted_by` | Gate |
|---|---|---|---|
| Link, `POST /api/auth/web/redeem` (P1) | cookie, all accounts | `link` | `ensureActiveUser`, as `IssueSessionForUser` |
| Code, `POST /api/auth/web/code-redeem` (P2) | cookie | `code` | `codeSignInAllowed`; ineligible accounts are never sent a code, and redeem answers the wrong-code 400 |
| Password, `POST /api/auth/web/login` (P4) | cookie, all accounts that can pass it | `password` | full `AuthService.Login`, TOTP step for enrolled accounts |
| Handoff, `POST /api/auth/web/handoff-redeem` (P5) | cookie, all accounts, bound to the parent app session | `handoff` | a live app refresh row (P5 step 3) |

**Why only the code is restricted.** A link and a handoff token are 256-bit (`internal/service/token/token.go:42-45`); a 6-digit code is online-guessable. `codeSignInAllowed(user)` is false when MFA is required (`MfaEnabled || isPilotUser`, extracted from `auth_service.go:259-260`) or the account has an active non-therapist assignment, via new `IAMRepo.HasActiveNonTherapistRole`:

```sql
SELECT EXISTS (SELECT 1 FROM user_role_assignments ura JOIN roles r ON r.role_id = ura.role_id
  WHERE ura.user_id = $1 AND ura.revoked_at IS NULL AND r.code <> 'app.therapist')
```
Scope is ignored, so a practice-scoped `ops.system_admin` counts as staff. `/web/refresh` re-runs it only when `web_minted_by='code'`: a code session whose account gains a role or MFA is deleted with a 401. Every other session is re-checked by `ensureActiveUser` alone, as the app's refresh is.

**MFA errors as sentinels.** `auth_service.go` gains `ErrMFANotSetUp`, `ErrMFARequired`, `ErrInvalidMFA`, returned at `:262`, `:265`, `:269` with their current text, so body-mode 401 bodies stay byte-identical (`auth.go:100`; `agent-report-reader.md:137`). `/web/login` maps them with `errors.Is`: `ErrMFARequired` → `{"error":{"code":"mfa_required"}}`; `ErrMFANotSetUp` → `mfa_setup_required`; `ErrInvalidMFA` and bad credentials → the same `invalid_credentials` 401.

### Renewal in the page (P1)
**Hint.** `localStorage kerr.web.hint="1"`, not secret. Set on any web sign-in; cleared on logout and on a 401. No hint, no refresh call. Hint gone but cookie present → the page shows signed out, and the next successful sign-in of any kind deletes that session.

**Triggers** (hint set, no token in memory): load; `visibilitychange` to visible and `focus`; a `BroadcastChannel('kerr-web-session')` `signed-in` message, which every sign-in posts. Tab B redeems, tab A flips.

**Serialising.** `navigator.locks.request('kerr-web-refresh', {signal: AbortSignal.timeout(10_000)})`; a timeout shows Retry. Without Web Locks, only the visible, focused tab refreshes. A per-tab `epoch`, bumped on `signed-out`, discards late responses.

**Responses.** 401 → clear the hint, signed out. Network error, 5xx or 429 → Retry with backoff. The access token renews at 60% of the JWT's `exp−iat`, read from the payload decoded as base64url, the same decoding kerrUI's `roleFromAccessToken` uses (`useKerriganAuth.ts:72-84`, which reads only `role`), and on any 401.

**Old sessionStorage token.** (1) Logout with its access token via `POST /api/auth/logout` (`router.go:329`): 204 → done; 401 → body refresh, then logout; 401 on both → done. (2) Any other status or a network error → keep the key, count it in `kerr.web.oldtries`, retry on later loads up to 5. (3) After 5, delete the key. (4) Every case tells the user once (`kerr.web.upgrade_notice`): "We changed how the finder keeps you signed in. Please sign in once more."

### Sign-out revokes every finder session
After P1 the finder holds a server session only as one `refresh_tokens` row reached by the cookie, whatever minted it, plus at most one legacy body-mode token during the upgrade.

| Session | Revoked by |
|---|---|
| `link`, `code`, `password`, `handoff` cookie row | `/web/logout`: `DELETE … WHERE $h IN (token_hash, prev_token_hash)`, else the `refresh_token_retired` lookup deletes the parent; retired rows cascade |
| `handoff` row, on app logout | immediately: `DeleteRefreshToken` (`user_repository.go:283`) becomes one transaction, `DELETE FROM refresh_tokens WHERE user_id = $2 AND (token_id = $1 OR parent_token_id = $1)` then `DELETE FROM finder_handoff_issues WHERE parent_token_id = $1` (P5) |
| `handoff` row, parent expired, pruned (including by a later mint, above), purged or admin-revoked | refused at its next finder refresh (parent check, Procedure), which deletes it and the parent's `finder_handoff_issues` rows and answers 401 |
| Duplicate cookies on one request | every presented row deleted, cookie cleared |
| Orphan cookie (hint lost) | deleted by the next successful mint on any web route |
| Legacy sessionStorage token | the upgrade path above, via `/api/auth/logout` |
| Access JWT in memory | dropped by the page; kerr-finder rejects it within 60 s (`internal/kerrauth/kerrauth.go:20-21`, `CacheTTL = 60 * time.Second`) |

**Residual.** When a parent ends without an app logout (expiry, prune, purge, admin revoke), the finder's access JWT already issued stays valid for at most 15 min (`config.go:502`), plus the 60 s kerr-finder cache; no new one is minted.

The page clears the hint and posts `signed-out` only after `/web/logout` answers 204; any other answer shows "Sign-out did not reach the server. Retry." Other tabs flip on `signed-out`.

### Web rotation (P1)
**Migration `000087_web_session_and_code`.**
- `refresh_tokens` gains `prev_token_hash VARCHAR(64)`, `prev_valid_until timestamptz`, `grace_used bool NOT NULL DEFAULT false`, `grace_next_enc bytea`, `web_minted_by VARCHAR(16)` checked to `link`, `code`, `handoff`, `password`, and `parent_token_id uuid` with **no foreign key** (an FK cascade would fire on every app refresh, Facts), under the NULL-safe `CHECK ((web_minted_by IS NOT DISTINCT FROM 'handoff') = (parent_token_id IS NOT NULL))`.
- New table `refresh_token_retired(token_id uuid REFERENCES refresh_tokens ON DELETE CASCADE, hash VARCHAR(64) NOT NULL, retired_at timestamptz NOT NULL)`. Web rows are never deleted by app rotation, so this cascade only fires on web-session deletes.
- New table `finder_handoff_issues(parent_token_id uuid NOT NULL, issued_at timestamptz NOT NULL)`, no foreign key (so app rotation does not reset the count), index `(parent_token_id, issued_at)`.
- `auth_tokens` (`000025_registration_flow.up.sql:90-101`) gains `parent_token_id uuid`, carried from the handoff issue to its redeem.
- Indexes: partial on `prev_token_hash IS NOT NULL`, partial on `parent_token_id IS NOT NULL`, `retired(hash)`, `retired(token_id, retired_at)`. The P2 columns are in this migration too.

**Sealing.** `grace_next_enc` is AES-256-GCM, key `HKDF(JWT_SECRET,"kerr-web-grace-v1")`, random 12-byte nonce, AAD `token_id`; opened only in a query that also requires `prev_valid_until > now()`; NULLed at the next rotation. A failed `open()` (e.g. after a `JWT_SECRET` rotation) is a grace miss, row 4.

**Procedure.** One transaction: `SELECT … WHERE $h IN (token_hash, prev_token_hash) AND web_minted_by IS NOT NULL FOR UPDATE`, else look `$h` up in `refresh_token_retired`. "Checks" = `ensureActiveUser`; plus `codeSignInAllowed` for `code` rows; plus, for `handoff` rows, the parent check below. Failing checks deletes the row → 401. "Mint" = `MintAccessForSession(ctx, token_id, user_id)`.

**Parent check (handoff rows), shared by `/web/refresh`, `/web/handoff-redeem` and `/handoff/finder`.** A parent row with `token_id = parent_token_id`, the same `user_id`, `web_minted_by IS NULL` and `expires_at > now()`. If none is found, the handler waits 200 ms and runs the same query once more, inside the same request; only a second miss fails (on refresh: delete the child and the parent's `finder_handoff_issues` rows, then 401). Reason: the app's own refresh removes and re-creates the parent as two statements in one request (`auth_service.go:352`, then the insert at `:633` reached from `:369`), with a few DB calls between them (Facts), so the parent is briefly absent on every app refresh. unverified: that this span is always under 200 ms; the recheck is one retry, so a slower span signs the finder out, and signing back in is one handoff.

| # | `$h` matches | Condition | Action → response |
|---|---|---|---|
| 1 | `token_hash` | `expires_at > now()`, checks pass | Retire the old `prev_token_hash`; purge; `prev=$h`, `prev_valid_until=now()+60s`, `grace_used=false`, `grace_next_enc=seal(B)`, `token_hash=hash(B)`; slide the four columns; mint → 200 with B |
| 2 | `token_hash` | `expires_at ≤ now()` | DELETE → 401 |
| 3 | `prev_token_hash` | `prev_valid_until > now()`, `NOT grace_used`, `open()` succeeds, checks pass | Same B, no rotation; `grace_used=true`, `grace_next_enc=NULL`; slide; mint → 200 with B |
| 4 | `prev_token_hash` | grace used, window passed, or `open()` failed | DELETE → 401 |
| 5 | `refresh_token_retired.hash` | — | DELETE, cascading → 401 (RFC 9700 §4.14.2) |
| 6 | nothing | — | 401 |

**Purge.** In row 1: `DELETE FROM refresh_token_retired WHERE token_id=$id AND retired_at < now() - REFRESH_TOKEN_DURATION`. A tab renews every ≈9 min (60% of 15 min), ≈160 rows a day, kept 7 days: ≈1,120 rows per open tab.

**Consequences.** Two tabs sending A at once both get B. A thief inside the 60 s window shares B until the first divergence, which kills the session. A retry after 60 s signs out. Two consecutive lost responses sign out (row 3 serves the grace once); signing in again takes one link, code or password.

**Limits.** `auth.web_refresh`, `auth.web_logout`, `auth.web_redeem`: 60/min per IP, the `MagicLinkRedeemLimits` value (`internal/api/middleware/public_limiter.go:263-266`); ≈540 open tabs per NAT address at steady state.

### P2: the code
**Storage.** `code_hash = HMAC-SHA256(HKDF(JWT_SECRET,"kerr-magic-code"), token_id‖code)` plus `code_attempts`, in 000087. `IP_HASH_PEPPER` falls back to `JWT_SECRET` (`config.go:586-588`), so it adds no separate key. `JWT_SECRET` is required only in production (`:622-624`); new rule: config load fails if `WEB_SESSION_ORIGINS` is set and `JWT_SECRET` is empty.

**Lifetime.** Same TTL and single use as the link. Only the newest code works; older links stay usable. The `signup/service.go:944` and `:1012` issuers get no code; the template uses `{{if .Code}}`. `sendMagicLink` passes `Code` only when `codeSignInAllowed`.

**`RedeemCode`, one transaction.** (1) `SELECT … WHERE email_normalized=$1 AND purpose='magic_link' AND consumed_at IS NULL AND expires_at>now() ORDER BY token_id FOR UPDATE` (id order, no deadlock). (2) Sum of `code_attempts` ≥5 → 400 without comparing. (3) Newest row with a `code_hash`; none → 400. (4) `code_attempts+1` before comparing. (5) `hmac.Equal`: match → `ConsumeByIDForPurpose(id,'magic_link')`; miss → if the new sum is ≥5, NULL every `code_hash`.

**Bound per account.** Attempts leave the sum only when their row expires; rows are created ≤5/hour per email (`internal/api/middleware/public_limiter.go:251-258`, `MagicLinkRequestLimits`), so ≤25 guesses an hour against a 10⁶ space: **≈6×10⁻⁴ per day per account**.

**Lockout by a stranger, accepted.** Five wrong guesses by anyone make the code unusable for that email until those rows expire, ≤30 min (the link TTL). The emailed link and the password still sign in.

**Population bound.** A global `FailureLimiter` of 200 failed codes an hour across all emails: ≤4,800 guesses a day ⇒ **≤4.8×10⁻³ accounts per day in total, whatever N**. When it trips, code entry pauses for everyone for the rest of the hour (links, password, handoff unaffected), and it logs once per window: `slog.Warn("code redeem global breaker tripped", "failures", n, "window_end", t)`, no email or IP.

**Limiters.** `auth.web_code_redeem`: 20 per 10 min per IP, 10 per 10 min per email (the `LoginLimits` values, `internal/api/middleware/public_limiter.go:322-326`); per-IP failures 30/hour; global 200/hour. The failure limiters are a new in-process `middleware.FailureLimiter`: correct with one replica, reset on restart; the durable bound is `code_attempts`. An attacker can drain one email's buckets for ≤30 min; the link still works.

### P4: password on the finder
- `POST /api/auth/web/login` with `LoginLimits` (`router.go:223-224`), the web guard, and full `AuthService.Login`.
- First submit without a token → `mfa_required`; the finder shows a 6-digit authenticator field (`autocomplete=one-time-code`) and resubmits email, password and `mfa_token`, the password kept only in the form. This step only adds a path for enrolled accounts; the app has none (Facts).
- `mfa_setup_required` → "This account signs in with the emailed link."
- **Set a password:** a signed-in control calls `POST /api/auth/password` (`Authenticate` only, `router.go:306-315`); the server rule is unchanged, no current-password check, per the owner's 2026-09-17 decision (kerrUI `src/pages/SettingsLayout.tsx:608-616`).

### P5: app handoff
Handoff works only when the app is already signed in in this browser; otherwise the finder points to the link or password. The popup never rotates the app's refresh token.
1. **Finder opens the app** on the click: `w = window.open(appOrigin + '/auth/finder-handoff')`, `appOrigin = new URL(site.Params.appUrl).origin`. New `appUrl` in `hugo.toml` (`https://ui.latentworx.com/`), `deploy/finder-dev.toml` (`https://ui.jhax.dev/`), `deploy/finder-stub.toml` (`http://127.0.0.1:1315/`), replacing the template default at `finder.html:20`. `w` null → "Your browser blocked the Kerrigan window. Use the emailed link, the code or your password." The finder watches `w.closed` up to 5 min, then shows a message and drops the listener.
2. **Popup route, outside the auth provider.** kerrUI `App()` (`App.tsx:606-617`) returns `<FinderHandoff />` before `<AuthProvider>` when `location.pathname === '/auth/finder-handoff'`, so no `useKerriganAuth`, no proactive timer and no `kerriganFetch` retry run in the popup. It refuses, before any request, when `window.__FINDER_ORIGIN__` is unset ("Finder sign-in isn't set up here"), with no `window.opener`, or when framed. No `kerrigan_auth` in `localStorage` → posts `{error:'signed_out'}` to the opener and closes; the finder shows "You're not signed in to the Kerrigan app in this browser. Use the emailed link or your password." Otherwise it asks "Sign in to the finder as <email>?" (`email` from the stored record).
3. **Confirm.**
   - **Client.** On click it reads `localStorage['kerrigan_auth'].refreshToken` and calls plain `fetch(apiBase + '/api/auth/handoff/finder', {method:'POST', credentials:'omit', headers:{'Content-Type':'application/json'}, body: JSON.stringify({refresh_token})})`, with no `Authorization`. On a 401 it re-reads storage once (the opener tab may have rotated) and retries once if the token changed; then "Could not confirm. Use the emailed link or your password." A 429 shows "Too many finder sign-ins from this app session. Try again in an hour." On 200 it calls `window.opener.postMessage({code}, window.__FINDER_ORIGIN__)` and closes.
   - **Server.** `POST /api/auth/handoff/finder` is public, `publicLimiter` `auth.handoff_issue` 60/min per IP, `decodeSignupJSON`, and `Origin` = the origin of `AppBaseURL` (`config.go:203-209`, `magic_link_handlers.go:271`). It calls `GetLiveAppRefreshRow(hash)` (with the shared 200 ms recheck on a miss) and `ensureActiveUser`. Any miss → 401. Then, in one transaction: `SELECT 1 FROM refresh_tokens WHERE token_id = $parent AND web_minted_by IS NULL AND expires_at > now() FOR UPDATE` (gone → 401), which serialises concurrent issues for one parent; count `finder_handoff_issues` for that parent in the last hour, ≥3 → 429; else insert one row, delete that parent's rows older than an hour, and issue a `finder_handoff` auth token (256-bit, 120 s) carrying `parent_token_id`. It never rotates or deletes the app row; the row lock lasts only that transaction, and an app refresh arriving meanwhile waits for it. It logs `slog.Info("finder handoff issued", "user_id", u, "parent_token_id", p)`, never a token.
   - **What this grants.** The same holder: whoever can present the app refresh token can already mint a full session at `/api/auth/refresh` (`auth_service.go:346-370`). The handoff gives that holder a finder session that is deleted on app logout and refused once its parent is gone (residual above), at most 3 per app session per hour, each logged. Its JWT still carries the app's full API scope (follow-up).
4. **Finder redeems** only when `event.origin === appOrigin && event.source === w`: `POST /api/auth/web/handoff-redeem`, `ConsumeForPurpose(hash,'finder_handoff')` (a token of another purpose is not burned), parent row still live (shared recheck), session minted with `WebMintedBy="handoff"` and `ParentTokenID` from the token, limiter `auth.web_handoff_redeem` 60/min per IP.
5. **Framing.** kerrUI `deploy/nginx.conf` gains `X-Frame-Options: DENY` and `frame-ancestors 'none'` (`add_header … always`) inside `location = /index.html` (`:27-31`), which serves every SPA route through the fallback `try_files … /index.html` (`:34-36`). The headers ship inside the kerrUI image, so they reach dev and prod only through the kerrUI pins.
6. **Migration `000088_finder_handoff_purpose`:** only `ALTER TYPE auth_token_purpose ADD VALUE IF NOT EXISTS 'finder_handoff'` (enum `000025_registration_flow.up.sql:88`; precedent `000015_scoped_rbac.up.sql:6`). The runner wraps each migration in a transaction (`internal/migrate/migrate.go:14-15`), which needs PG ≥12; prod probe `SELECT current_setting('server_version_num')` ≥120000.

**Numbering.** No `origin/*` branch claims a migration ≥000087; re-run `git ls-tree -r --name-only origin/main -- migrations/` before each merge (`migrations/README.md:70`).

## Steps

**P3 (landing, ships first)**
1. Create the seven script files in the P3 table and vendor `assets/js/vendor/posthog-<pinned>.no-external.js`; replace each inline block in `baseof.html`, `video.html` and `productcarousel.html` with its `<script src integrity data-…>`; replace `productcarousel.html:2` with the Store counter.
2. Add `layouts/partials/csp.html` (with the GA4/Clarity `errorf`) and include it in `baseof.html` before every script.
3. Add the framed-page guard to `finder.js`.
4. Add `scripts/finder-csp-check.mjs`, `scripts/fixtures/csp-violation.html`, the draft `content/csp-fixture/index.md`, and `public-csp/` to `.gitignore`. Build mode runs `HUGO_ENVIRONMENT=production HUGO_PARAMS_ANALYTICSENABLED=true HUGO_PARAMS_POSTHOGKEY=phc_ci_dummy hugo --gc --minify --buildDrafts --destination public-csp --baseURL http://127.0.0.1:1316/` (production config only), served on :1316, and scans every built `.html`; live mode is `--live <urls>`. `make csp-check` ends with `hugo --gc --minify && test ! -e public/csp-fixture`. Add the pinned `setup-node` v4.4.0 step and `make csp-check` (after the stub checks) to `finder-check.yml`.

**P1 (after the P3 live gate)**
1. Kerrigan: add `migrations/000087_web_session_and_code.{up,down}.sql`.
2. Kerrigan repository and model: add `WebMintedBy` and `ParentTokenID` to `models.RefreshToken` and insert them in `CreateRefreshToken` (`user_repository.go:177-200`); add `AND web_minted_by IS NULL` plus the web-row delete to `GetAndDeleteRefreshToken` (`:251-278`); add `RotateWebRefreshToken`, `DeleteWebSession` and `GetLiveAppRefreshRow` to `user_repository.go`, `UserRepo` (`:15-42`) and both fakes (`auth_service_test.go`, `subscribe_handlers_test.go`); add `HasActiveNonTherapistRole` to `iam_repo.go`; `ConsumeForPurpose` and `ConsumeByIDForPurpose` to `auth_token_repo.go`, its interface (`:22-47`) and the fakes in `handlers/magic_link_handlers_test.go` and `service/token/token_test.go`; add `internal/crypto/gracebox`.
3. Kerrigan `auth_service.go`: add the `SessionMetadata` fields and copy them in `issueTokensWithSessionID`; extract `signAccess` and add `MintAccessForSession`; introduce the three MFA sentinels and `codeSignInAllowed`.
4. Kerrigan: add `handlers/web_session.go` with `WebRedeem` (`magic_link` or `signup_welcome`, then `IssueSessionForUser` with `WebMintedBy="link"`, plus the cookie), `WebRefresh` (including the shared parent check, its wait injectable for tests), `WebLogout`, `setWebSessionCookie`, a shared `dropIncomingSessions` called after a successful mint, and the guard.
5. Kerrigan `config.go`: add `WEB_SESSION_ORIGINS`, `WEB_REFRESH_GRACE` (60s) and the empty-secret refusal.
6. Kerrigan `router.go`, `internal/api/middleware/public_limiter.go`: mount `/api/auth/web/{redeem,refresh,logout}` with their limiters.
7. Kerrigan live helpers: edit `liveDB` in `internal/repository/note_export_live_test.go` (`:27`); create `internal/service/token/live_helper_test.go` and `internal/service/auth_live_helper_test.go` (`liveAuthService(t)`, a real `AuthService` on the live DB, for the AuthService live tests in `internal/service/auth_web_live_test.go`); each helper calls `t.Fatal` when `KERRIGAN_REQUIRE_LIVE_DB=1`, else `t.Skip("KERRIGAN_TEST_DATABASE_URL not set")`, which the CI assert greps (`.gitea/workflows/gitea-ci.yml:198-216`).
8. Landing `finder.js`: replace storage and renewal (`:330-475`, with the 401 call sites at `:381` and `:490`), the redeem call (`:1577-1579`) and sign-out (`:1593-1601`) with the memory token, hint, triggers, lock, epoch, broadcasts, `/web/redeem`, the confirmed sign-out, and old-token revocation.
9. Landing `finder.html`: add "Signed in to the Kerrigan app? The finder signs in separately — we'll email you a link."
10. lwx-infra dev: one PR setting `WEB_SESSION_ORIGINS=https://landing.jhax.dev` in `overlays/dev/kustomization.yaml`, and the branch image (built by `image.yml` `workflow_dispatch` on the branch, `:19`) in `overlays/dev/pins/kerrigan/kustomization.yaml:7-8`; the landing branch image in `landing-site.yaml`. After the Kerrigan merge, the tracker 240 bot pins `main` in that same file.
11. Before every dev walk, confirm the branch image is pinned and live: after `git -C lwx-infra fetch`, `git -C lwx-infra show origin/trunk:manifests/kerrigan/overlays/dev/pins/kerrigan/kustomization.yaml` piped to `grep -q 'newTag: "<branch sha>"'`, and again to `grep -q 'digest: sha256:<branch digest>'`, both exit 0. Then `curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Origin: https://landing.jhax.dev' -H 'Content-Type: application/json' -d '{}' https://api.jhax.dev/api/auth/web/refresh` prints `401` (branch image live; `404` means it is not). If the tracker 240 bot has overwritten the pin, re-pin with the step 10 PR first.
12. Landing tests: extend `scripts/finder-stub-api.mjs` (rotation table, drop-response flag, short TTLs, a staff+MFA stub user, a pilot-named unenrolled stub user, `/api/me`, `/finder/v1/me/shortlists`); add `scripts/finder-session-check.mjs` and `make session-check`. `--target <origin>` exits 1 on the repro today; after the fix it exits 2 without `--link`, so post-fix live verification is `--link` from the agent inbox (tracker 241) or the owner (`verify: human`). The loopback stub has one cookie scope, so the dev walk is the real-site check.

**P2**
1. `token.go`: change `Issue` (`:117-124`) to take variadic `opts ...IssueOption` after `ttl`, so the four existing callers compile unchanged; update the three interface declarations (`token.go:77`, `magic_link_handlers.go:30`, `signup/service.go:150`) and their fakes; add `WithCode()` and `RedeemCode`.
2. `sendMagicLink`: pass `WithCode()` when `codeSignInAllowed`; add the conditional template line.
3. Mount `POST /api/auth/web/code-redeem` (`WebMintedBy="code"`) with `auth.web_code_redeem`, the per-IP and global `FailureLimiter`s, and the breaker log.
4. Landing: add the code field, plus stub and check cases.

**P4**
1. Kerrigan: add `WebLogin` (`WebMintedBy="password"`) and mount `POST /api/auth/web/login`, mapping the sentinels.
2. Landing: add the password form, the TOTP step, the set-password control, plus stub and check cases.

**P5**
1. Kerrigan: add 000088 and `AuthTokenPurposeFinderHandoff` in `knownPurpose`; add `ParentTokenID *uuid.UUID` to `models.AuthToken` (`internal/models/authtoken.go:33`), `parent_token_id` to `authTokenColumns` (`auth_token_repo.go:61-63`) and to the insert and scan, and an `IssueOption` `WithParentToken(id)` on `token.Issue`; add the public `POST /api/auth/handoff/finder` (read-only lookup, shared recheck, parent row lock for the cap, issue log, `AppBaseURL` origin, `auth.handoff_issue`) and `/web/handoff-redeem` (`WebMintedBy="handoff"`, `ParentTokenID` from the token); make `DeleteRefreshToken` (`user_repository.go:283`) the two-statement transaction in the sign-out table.
2. kerrUI: add `src/pages/FinderHandoff.tsx` and the pre-provider branch in `App()` (AGENTS.md Rule 0), read `window.__FINDER_ORIGIN__` in `src/lib/runtime.ts`, add the `nginx.conf` headers.
3. Landing: add the button, popup, listener, signed-out message and redeem; `appUrl` in the 3 toml files; the P1.9 line becomes "Signed in to the Kerrigan app? [Use my Kerrigan sign-in]"; `scripts/finder-app-stub.mjs` on `127.0.0.1:1315` runs the confirm page and postMessage in CI.
4. lwx-infra dev: set `window.__FINDER_ORIGIN__="https://landing.jhax.dev"` in `overlays/dev/runtime-config.js`; the kerrUI branch image in `overlays/dev/kustomization.yaml:1324-1325`; the backend in `pins/kerrigan/kustomization.yaml` (checked as in P1.11).

## Acceptance
Issue 274's tick-boxes, verbatim (forge API, 2026-11-18), each with what proves it.
- [ ] Signing out of the finder ends the sign-in on the server, not only in the browser
  - P1. `TestLiveWebLogout_EveryMintKind`, `TestLiveWebLogout_DeletesAllHashes`; session-check `sign-out revokes`, `finder API 401 within 60 s`.
- [ ] Reproduced on the live finder, with the steps written on this issue — cause confirmed in code 2026-11-18; headless reproduction is part of the fix's check
  - Repro above; `finder-session-check.mjs --target https://latentworx.com` exits 1 today with `FAIL: new tab signed out`.
- [ ] Signed in from the emailed link, the counselor stays signed in when they return to a finder tab they already had open, and in a new tab
  - P1, every account class. Session-check `new tab`, `restart`, `open signed-out tab flips`, `staff MFA link: new tab, restart`, `pilot unenrolled link: new tab, restart`; dev walk by the owner's own account.
- [ ] A counselor signed in to the Kerrigan app is not asked to sign in again on the finder, or the finder says plainly why
  - P1.9 says why; P5 signs them in when the app is signed in in that browser. Session-check `app line shown`, `handoff own session`, `handoff app signed out message`.

Not a tick-box: the 2026-11-18 Decision ("I can only log by emailing a sign-in link") is met by P2 and P4 for the accounts they can serve: session-check `code sign-in`, `password sign-in`, `mfa password sign-in`. For MFA-unenrolled pilot accounts the link remains the only way in, in the app and the finder alike.

## Out of scope
Signing out of the app with the finder (beyond handoff sessions, which end with their app session), and "sign out on all devices": product follow-ups, no call now.

## Follow-ups to file
- **Kerrigan:** body-mode reuse detection; a rate limit on body-mode refresh (`router.go:239`); a finder-only token scope (finder JWTs, handoff ones included, carry the app's full API scope); link redemption skips MFA in the app and the finder alike (`auth_service.go:482-501`); passkeys; `MagicLinkRedeem` consumes before its purpose check (`magic_link_handlers.go:369` consumes, `:391-396` checks).
- **kerrUI:** no TOTP entry on app sign-in (`useKerriganAuth.ts:233-239`); no cross-tab token sync, so two app tabs can each hold a different refresh token in memory; logout swallows a failed backend call and clears the local session anyway (`useKerriganAuth.ts:191-193`), so an app sign-out that fails server-side leaves the app session, and its handoff children, alive (all three pre-existing, not this issue's); `index.html:4` ships a `window.onerror` / `onunhandledrejection` beacon that POSTs error details to `http://localhost:4000/`.
- **lwx-infra:** `docs/runbooks/kerrigan-deploy.md:169-174` describes a dev pre-merge `images:` block in `overlays/dev/kustomization.yaml`; the dev backend pin is now `overlays/dev/pins/kerrigan/kustomization.yaml` (`overlays/dev/kustomization.yaml:1317-1318`, tracker 240).

## Depends on
- Each piece's backend is live before its page change; P1 and P4 wait on the P3 live gate.
- Prod verification needs the owner or the agent inbox, tracker 241 — https://git.jhax.dev:30300/LatentWorx-Kerrigan/tracker/issues/241

## Test plan

**Live DB.** The executor runs it against a throwaway Postgres; the checker reads the output.
```
docker run -d --rm --name kerr274-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=kerrigan_test -p 127.0.0.1:55432:5432 postgres:15-alpine
export U='postgres://postgres:postgres@127.0.0.1:55432/kerrigan_test?sslmode=disable'
go run ./cmd/server migrate --database-url "$U"
KERRIGAN_REQUIRE_LIVE_DB=1 KERRIGAN_TEST_DATABASE_URL="$U" go test ./internal/repository/ ./internal/service/... ./internal/api/handlers/ -run 'TestLive(WebRotate|WebLogout|WebMintedBy|BodyRefresh|RedeemCode|CodeEligibility|ConsumeForPurpose|Handoff)' -count=1 -v
```
Passes: a `--- PASS` per test below, `ok` per package, 0 `--- SKIP`. The image matches `docker-compose.yml:5`. `TestLiveWebMintedBy_*`, `TestLiveBodyRefresh_*` and `TestLiveHandoff_AppLogoutDeletesHandoffRow` live in `internal/service/auth_web_live_test.go`; repository-level ones in `internal/repository/`; token ones in `internal/service/token/`; handler-level ones in `internal/api/handlers/`.

| Test | Proves |
|---|---|
| `TestLiveWebMintedBy_WrittenAndKept` | a row created with `WebMintedBy="code"` reads back `code`, and still does after rotation; an app row reads back NULL |
| `TestLiveWebMintedBy_CheckRejectsMismatch` | inserting `web_minted_by='handoff'` with NULL `parent_token_id`, or `parent_token_id` with NULL or `'link'` `web_minted_by`, fails the CHECK; an app row (both NULL) passes |
| `TestLiveWebRotate_Rotates` | A→B, predecessor retired, no new `refresh_tokens` row |
| `TestLiveWebRotate_ConcurrentSameCookie` | two goroutines sending A both get B; the row survives |
| `TestLiveWebRotate_GraceUsedThenAKills` | a third A deletes the row |
| `TestLiveWebRotate_TwoLostResponsesSignOut` | A, A (grace), A → 401, row gone |
| `TestLiveWebRotate_GraceBoundary` | A at 59 s → B; at 61 s → row deleted; an expired seal is never opened |
| `TestLiveWebRotate_SealOpenFails` | changed key → 401, row deleted |
| `TestLiveWebRotate_ExpiredRow` | past `expires_at` → 401, row deleted |
| `TestLiveWebRotate_ThiefSequenceKills` | A→B, B→C, then A (retired) → row deleted, cascading |
| `TestLiveWebRotate_PurgesOldRetired` | only this session's rows older than `REFRESH_TOKEN_DURATION` go |
| `TestLiveWebRotate_SlideKept` | the four columns update; the role is re-read on rows 1 and 3 |
| `TestLiveWebRotate_InactiveUser` | disabled account → 401, row deleted |
| `TestLiveWebRotate_LinkSessionKeptForStaffMFA` | a `link` session of an MFA user with `ops.system_admin` keeps rotating |
| `TestLiveWebRotate_RoleGrantedLaterKillsCodeSession` | a `code` session whose user later gets `ops.viewer` → 401, row deleted |
| `TestLiveBodyRefresh_RejectsWebRow` | a web row's token at body `RefreshTokens` → error, row deleted, no new token |
| `TestLiveBodyRefresh_AppRowStillRotates` | a `web_minted_by IS NULL` row rotates as today |
| `TestLiveCodeEligibility_RevokedIgnored` | a revoked `app.admin` assignment → still eligible |
| `TestLiveCodeEligibility_PracticeScopedAdminIsStaff` | a practice-scoped `ops.system_admin` → ineligible |
| `TestLiveWebLogout_DeletesAllHashes` | the current or previous hash deletes the row and its retired rows |
| `TestLiveWebLogout_EveryMintKind` | for `link`, `code`, `password`, `handoff` rows, logout by cookie leaves 0 rows for that session |
| `TestLiveHandoff_LookupReadOnly` | `GetLiveAppRefreshRow` on a live app row returns its ids; `token_hash` and `expires_at` unchanged |
| `TestLiveHandoff_WebOrExpiredRowRefused` | a web row's token → `ErrNotFound`; an expired app row's token → `ErrNotFound` |
| `TestLiveHandoff_AppLogoutDeletesHandoffRow` | `AuthService.Logout` on the parent app session → the handoff row and the parent's `finder_handoff_issues` rows are gone in one transaction; the child's cookie refresh → 401 |
| `TestLiveHandoff_ParentExpiredChildRefused` | parent `expires_at` set in the past, or parent deleted by `PruneUserSessions` → the child's next web refresh → 401 after the recheck; the child row and the parent's issue rows are deleted |
| `TestLiveHandoff_MintPruneEvictsParent` | a user with a handoff parent plus 10 more recently active sessions signs in once more by link; the prune removes the parent; the child's next refresh → 401 |
| `TestLiveHandoff_ChildSurvivesAppRotation` | (a) the parent rotates through body refresh 3 times; the child still refreshes. (b) Injected gap: the test deletes the parent, starts the child's web refresh, and re-inserts the parent with the same `token_id` 100 ms later; the refresh returns 200 after one recheck, and the child row is intact. (c) Same, re-insert after 400 ms → 401, child deleted. (d) The same 100 ms gap during `/handoff/finder` → 200 |
| `TestLiveHandoff_FourthIssueInHour429` | three issues from one parent → 200; the 4th within the hour → 429, also after the parent rotates; another parent is unaffected |
| `TestLiveHandoff_ConcurrentIssuesCapped` | 6 goroutines issue for one parent at once → exactly 3 get 200, 3 get 429 |
| `TestLiveRedeemCode_AttemptsAtomic` | concurrent guesses counted before compare; at 5 the codes are NULLed, the next guess refused uncompared, the links still redeem |
| `TestLiveRedeemCode_OlderCodeRejectedLinkWorks` | older code rejected and counted, newer one signs in, older link still redeems |
| `TestLiveRedeemCode_IneligibleRefused` | MFA and `ops.viewer` users get the wrong-code answer |
| `TestLiveConsumeForPurpose_WrongPurposeNotBurned` | a `magic_link` token at handoff-redeem → 400; the link still redeems |

**Handler and service tests.** `go test ./internal/service/... ./internal/api/handlers/ ./internal/api/router/ ./internal/config/ ./internal/crypto/gracebox/ -run 'MFASentinel|MintAccess|WebSession|WebLogout|WebRedeem|WebMint|WebCookie|WebGuard|WebLimits|Code|WebLogin|Handoff|MagicLinkTemplate|ClaimFallback|Config|Gracebox|Breaker|IssueOption' -count=1` prints `ok` per package. Required cases:
- `TestMintAccessForSession_ClaimsMatchIssue`: same claim set as `issueTokensWithSessionID` for the session, no `CreateRefreshToken` call; an inactive user → `ErrInactiveUser`.
- `TestWebRedeem_StaffMFAAccountSetsCookie`: an MFA user with `ops.system_admin` gets `Set-Cookie: __Host-kerr_web`, `web_minted_by='link'`.
- `TestWebRedeem_PurposeParity`: `magic_link` and `signup_welcome` tokens redeem; a `finder_handoff` token → 400, as `MagicLinkRedeem` (`magic_link_handlers.go:391-396`).
- `TestWebMint_DeletesIncomingSession`: table over `redeem`, `code-redeem`, `login`, `handoff-redeem`; after a successful mint a synthetic orphan cookie's row is gone, and with two synthetic cookies both rows are gone.
- `TestWebMint_FailedMintKeepsIncomingSession`: a wrong code, a wrong password and a spent token, each with a synthetic incoming cookie → 400/401, and the incoming row still exists.
- `TestLogin_MFASentinelBodiesUnchanged`: body-mode 401 text is byte-identical to `agent-report-reader.md:137`.
- `TestWebLogin_MFATwoStepSetsCookie`: no token → `mfa_required`; valid TOTP → cookie, `'password'`. `TestWebLogin_MFANotSetUp` (pilot-named, unenrolled) → `mfa_setup_required`.
- `TestHandoffFinder_InactiveUserRefused` → 401; `TestHandoffFinder_ForeignOrigin`: Origin other than `AppBaseURL`'s → 403; `TestHandoffFinder_NoBearerNeeded`: no `Authorization`, valid body → 200; `TestHandoffFinder_LogsIssue`: one `finder handoff issued` record with `user_id` and `parent_token_id`, and neither the refresh token nor the handoff code anywhere in the record.
- `TestWebCookie_Attributes`: `__Host-kerr_web` has `Path=/`, no `Domain`, `HttpOnly`, `Secure`, `SameSite=Strict`, `Max-Age` = 604800; `TestWebSession_NoRefreshTokenInBody`: no web response body contains `refresh_token`.
- `TestWebGuard_ForeignOrigin403` and `TestWebGuard_TextPlain415`: each `/api/auth/web/*` route → 403 for a foreign Origin, 415 for `Content-Type: text/plain`.
- `TestWebLimits_429AtNPlusOne`: table over `auth.web_refresh`, `auth.web_logout`, `auth.web_redeem`, `auth.web_code_redeem`, `auth.web_handoff_redeem`, `auth.handoff_issue` and the per-IP failure limiter → 429 at N+1; the global code breaker at 201; `TestCodeBreaker_LogsOnTrip` sees one `code redeem global breaker tripped` record per window, with no email or IP attribute.
- `TestMagicLinkTemplate_CodeLineOnlyWithCode`: the email renders the code line when `.Code` is set and omits it otherwise. `TestClaimFallback_NoCode`: the `signup/service.go:944` and `:1012` issuers produce rows with no `code_hash`. `TestIssueOption_ParentToken`: `WithParentToken(id)` stores `parent_token_id`; the four existing callers' rows store NULL.
- Identical 400 bodies across code failure kinds; handoff 121 s expiry; gracebox AAD; the config refusal.

**Browser.** `make session-check` (stub, persistent `-profile`, 10 s access TTL, app stub on :1315) prints `PASS` per case:
- **P1:** `__Host- cookie accepted`, `redeem`, `new tab`, `restart`, `staff MFA link: new tab, restart` and `pilot unenrolled link: new tab, restart` (each stub user redeems a link, opens a new tab, the browser restarts with the same profile, and the page is signed in each time), `open signed-out tab flips`, `two tabs at once`, `dropped refresh`, `two drops sign out`, `late retry signs out`, `access expiry`, `late refresh discarded`, `sign-out revokes`, `sign-out failure shown`, `finder API 401 within 60 s`, `other tab signed out`, `anonymous: 0 refresh calls`, `old token: 204`, `old token: 401 then refresh+logout`, `old token: both 401`, `old token: 500 retried, deleted after 5, told once`, `old token: network error kept`, `upgrade notice once`, `app line shown`.
- **P2:** `code sign-in`, `older code rejected after a newer one`, `wrong codes keep link`, `staff gets no code`.
- **P4:** `password sign-in`, `mfa password sign-in`, `unenrolled password shows link copy`, `set password`.
- **P5:** `popup blocked message`, `popup closed message`, `handoff app signed out message`, `handoff own session`.

On `0efb762` the run prints `FAIL: new tab signed out`.

**P3.** `make csp-check` prints `PASS WebSocket`, `PASS control tripped`, then `PASS` per built page: CSP contains `https://api.latentworx.com`, `https://us.i.posthog.com` and `frame-src https://www.youtube-nocookie.com`, and no `child-src`; 0 inline scripts by the selector across every `.html` in `public-csp/`; PostHog with SRI; 0 violations, map rendered (or the WebGL fallback); the `csp-fixture` assertions; and the final `test ! -e public/csp-fixture` exits 0. API calls from the CI origin fail on CORS, which is not a CSP event. Live gate, before P1 and P4: `node scripts/finder-csp-check.mjs --live https://latentworx.com/ https://latentworx.com/articles/ai-scribes-42-cfr-part-2/ https://latentworx.com/finder/` prints `PASS control tripped` and `PASS` per page; the PR quotes it.

**kerrUI.** `npm test -- finderHandoff` prints all passing for: rendered without `AuthProvider` (no `useKerriganAuth` call); `finder origin unset` (shows "Finder sign-in isn't set up here", 0 requests); no opener; framed; signed-out reply when `kerrigan_auth` is absent; the confirm body is `{refresh_token}` read from `localStorage` at click time, with no `Authorization` header; `popup open 10+ min makes no refresh call` (fake timers advanced 11 min, 0 requests to `/api/auth/refresh`); `opener tab stays signed in` (the stored `kerrigan_auth` is byte-identical after a confirm); `opener rotated mid-handoff` (first confirm 401, storage changed, one retry succeeds); `429 message`; postMessage only to `__FINDER_ORIGIN__`.

**Other.** After each kerrUI pin: `curl -sI https://ui.jhax.dev/auth/finder-handoff | grep -i -E 'x-frame-options|frame-ancestors'` (dev) and the same on `https://ui.latentworx.com/auth/finder-handoff` (prod) print both headers. Dev walk on `https://landing.jhax.dev/finder/`, after the P1.11 check, with a real link (including the owner's staff/MFA account: new tab, restart), code, password plus TOTP, and handoff (then app sign-out: the finder tab signs out on its next refresh).

## Production path
Gates from lwx-infra `docs/runbooks/kerrigan-deploy.md` @`b3042c9`; §4 human gates are the owner's. `ReadBackAccountRecords` (§6, `:326-329`) is dropped: it guards changes to `internal/paidaccess.Granted`, and these pieces add ways to prove identity that mint the same JWT, which still meets that unchanged rule at the API gate.

**Dev vs prod pin.** Prod reads base: the backend at `base/kustomization.yaml:163-166`, kerrUI at `base/ui.yaml:384`. Dev shadows both: the backend through the `pins/kerrigan` Component (`overlays/dev/kustomization.yaml:1317-1318`), kerrUI through `images:` at `:1319-1325`. A base bump therefore changes only the gpu render.

**Who merges.** The owner merges prod pins by the owner rule of 2026-11-16 ("The owner merges production changes only (release or prod pins)", `~/.claude/CLAUDE.md`, Merging). unverified: the protected-file patterns on lwx-infra trunk (the branch-protection API answers 403 to agents, per the hub); an agent merge refused with `Changed protected files` would prove them.

| Step | Who | Source |
|---|---|---|
| PR → checker → agent merge; dev pins (P1.10, P1.11, P5.4); dev walk | agents | Steps |
| Backend `BuildAndPushImage` from merged Kerrigan `main` (forge `image.yml` on push, `:16-17`), digest captured (P1, P2, P4, P5) | CI; operator reads digest | runbook `:123-139` |
| kerrUI `BuildAndPushImage`, then `RunGates` (type-check, lint, test, build exit 0) (P5) | operator | runbook `:123-150` |
| `PreflightBackup`: `pg_dump` plus `ledgerBefore` | operator | §6 |
| `CheckLiveSessions`; `ApproveLiveSessionOverride` if a session is live | operator; **owner** | runbook `:101-121`, §4 |
| `ApproveDeployWindow` | **owner** | §4 |
| `ApproveProdMigration`: 000087 (P1); 000088 after the PG ≥12 probe (P5) | **owner** | §4 |
| `PinManifest`: one lwx-infra PR bumping `base/kustomization.yaml:165-166` to the new backend digest (P1, P2, P4, P5); `base/ui.yaml:384` to the kerrUI digest carrying the nginx headers (P5); (P1) `- name: WEB_SESSION_ORIGINS` / `value: "https://latentworx.com"` appended to the env list of the `kerrigan-backend` patch, after `TEMPORAL_NAMESPACE` (`overlays/gpu/kustomization.yaml:109-125`, patch `:96-125` under `patches:` at `:87`); (P5) `window.__FINDER_ORIGIN__="https://latentworx.com"` in `overlays/prod/runtime-config.js`. POST: `kubectl kustomize manifests/kerrigan/overlays/gpu | grep -E 'image: ghcr.io/coalescent-emergence/(kerrigan|kerrui)'` shows the new digests on the backend Deployment, the migrate Job and (P5) the UI, and `grep -A1 WEB_SESSION_ORIGINS` shows the value; `kubectl kustomize manifests/kerrigan/overlays/dev` is byte-identical before and after the PR | operator prepares | file lines above |
| `MergeToTrunk` of that PR on Gitea, merge SHA captured, GitHub mirror confirmed | **owner merges** (P1, P2, P4, P5) | runbook `:181-187` |
| `RefreshArgoCD`, then a manual **full** `SyncApp` (a scoped sync skips the PreSync migrate hook, `:217`) | operator | runbook `:189-254` |
| `VerifyMigration`, `VerifyRollout`, `VerifyServed`; (P5) the prod `curl -sI` header check | operator | runbook `:255-288` |
| `HumanVisualCheck` | **owner** | §4 |
| Landing PR → page `main`, after its routes answer in prod; P1 and P4 after the P3 live gate | agents | — |

**Route check**, per piece: `curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Origin: https://latentworx.com' -H 'Content-Type: application/json' -d '{}' https://api.latentworx.com/api/auth/web/<route>` → P1 `refresh` 401, `redeem` 400; P2 `code-redeem` 400; P4 `login` 401; P5 `handoff-redeem` 400. Page HTML caches 10 min (`max-age=600`).
