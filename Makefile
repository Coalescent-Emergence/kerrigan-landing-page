.PHONY: care-type-check matched-check domain-check serve-lan theme-editor dev stop finder-preview nav-check controls-check finder-style-lint transit-check org-check

serve-lan:
	@IP=$$(hostname -I | awk '{print $$1}'); \
	echo "Starting Hugo on LAN at http://$$IP:1313"; \
	hugo server --bind 0.0.0.0 --baseURL http://$$IP

theme-editor:
	@echo "Starting Theme Editor at http://localhost:8181"
	@go run scripts/theme-editor.go

dev:
	@echo "Starting dev environment..."
	@go build -o .theme-editor-bin scripts/theme-editor.go
	@./.theme-editor-bin > .editor.log 2>&1 & echo $$! > .editor.pid
	@IP=$$(hostname -I | awk '{print $$1}'); \
	hugo server --bind 0.0.0.0 --baseURL http://$$IP > .hugo.log 2>&1 & echo $$! > .hugo.pid
	@echo "----------------------------------------"
	@IP=$$(hostname -I | awk '{print $$1}'); \
	echo "🟢 Theme Editor: http://$$IP:8181"
	@echo "🟢 Hugo Site:    http://$$(hostname -I | awk '{print $$1}'):1313"
	@echo "----------------------------------------"
	@echo "Use 'make stop' to bring everything down."

stop:
	@echo "Stopping dev environment..."
	@-if [ -f .editor.pid ]; then kill $$(cat .editor.pid) 2>/dev/null || true; rm .editor.pid; fi
	@-if [ -f .hugo.pid ]; then kill $$(cat .hugo.pid) 2>/dev/null || true; rm .hugo.pid; fi
	@rm -f .theme-editor-bin .editor.log .hugo.log
	@echo "🔴 Dev environment stopped."

# Finder preview: finder on, reloads on save, talks to the dev search service
# (finderApiBase in deploy/finder-dev.toml, house network). That service allows browser calls only
# from http://localhost:1313 or http://127.0.0.1:1313, so the port is fixed.
finder-preview:
	hugo server --config hugo.toml,deploy/finder-dev.toml --bind 127.0.0.1 --port 1313

# Browser check that the site-nav links are visible and not covered on the finder page, at
# 1400px and 375px, and that the finder and Articles pills are marked current on their pages. Needs geckodriver running (geckodriver --port 4444) and finder-preview up.
NAV_URL ?= http://127.0.0.1:1313
nav-check:
	CURRENT=/finder/ node scripts/finder-nav-check.mjs $(NAV_URL)/finder/
	CURRENT=/articles/ node scripts/finder-nav-check.mjs $(NAV_URL)/articles/

# Browser check that the map-style buttons and "Search this map area" sit inside the window and are clickable
# at 1280x720 (crisis strip hidden and shown), 1440x900, 1920x1080, 900x800 and a phone window, plus the sign-up link and no leftover scroll on desktop. Needs geckodriver (:4444) and finder-preview up.
controls-check:
	node scripts/finder-controls-check.mjs $(NAV_URL)/finder/

# Fails when the search service supports a type of care the page does not offer (tracker 285). Reads the built
# page (public/finder/index.html) and scripts/fixtures/finder-service-domains.json; no network.
care-type-check:
	node --test scripts/finder-care-type-check.test.mjs
	node scripts/finder-care-type-check.mjs public/finder/index.html

# Style lint on the finder styles: duplicate selectors and vh window-height units (use dvh/svh).
finder-style-lint:
	node scripts/finder-style-lint.mjs assets/css/finder.css

# Headless check of the "Matched: <name>" line on finder cards (string, null, absent, markup as text).
# Builds against a stub API; needs geckodriver (:4444) and hugo.
matched-check:
	node scripts/finder-matched-check.mjs

# Dev-only pin check (tracker 250): builds with finderTransit on against a stub API, places a pin in
# headless Firefox, and asserts only the travel request carries its coordinates. Needs geckodriver (:4444) and hugo.
transit-check:
	node scripts/finder-transit-check.mjs

# Browser check that Any sends all four types and Crisis care sends crisis (stub API; needs geckodriver on :4444).
domain-check:
	node scripts/finder-domain-check.mjs

# Browser check for the parent-organization link (tracker 290): org= header, row buttons, Clear. Run against
# the stub API (scripts/finder-stub-api.mjs) with FINDER_BASE_URL set to the served site; needs geckodriver (:4444).
org-check:
	node scripts/finder-org-check.mjs
