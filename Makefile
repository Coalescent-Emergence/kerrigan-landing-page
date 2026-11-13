.PHONY: matched-check serve-lan theme-editor dev stop finder-preview nav-check controls-check

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

# Headless check of the "Matched: <name>" line on finder cards (string, null, absent, markup as text).
# Builds against a stub API; needs geckodriver (:4444) and hugo.
matched-check:
	node scripts/finder-matched-check.mjs
