.PHONY: serve-lan
serve-lan:
	@IP=$$(hostname -I | awk '{print $$1}'); \
	echo "Starting Hugo on LAN at http://$$IP:1313"; \
	hugo server --bind 0.0.0.0 --baseURL http://$$IP
