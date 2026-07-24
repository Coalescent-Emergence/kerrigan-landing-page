.PHONY: serve-lan theme-editor dev stop

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
