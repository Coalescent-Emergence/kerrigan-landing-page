# syntax=docker/dockerfile:1
# Dev-only image: builds the landing site with the finder switched on
# (deploy/finder-dev.toml, which also sets the dev API bases) and serves it via nginx. Production is built by
# .github/workflows/deploy.yml and never reads this file.
# The site has no Go module, npm or Sass step, so only Hugo extended is needed
# (version matches HUGO_VERSION in deploy.yml). Download is verified against
# the release's published checksum.
FROM debian:bookworm-slim AS build

# sha256: https://github.com/gohugoio/hugo/releases/download/v0.161.1/hugo_0.161.1_checksums.txt
ARG HUGO_VERSION=0.161.1
ARG HUGO_SHA256=9b82cf3211b2321f189a005dd157e6f4bd5c65f2bf5e9eefd2f5e0803c12103c
ARG BASEURL=https://landing.jhax.dev/

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl git \
    && rm -rf /var/lib/apt/lists/*
RUN curl -fsSL "https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/hugo_extended_${HUGO_VERSION}_linux-amd64.tar.gz" -o /tmp/hugo.tar.gz \
    && echo "${HUGO_SHA256}  /tmp/hugo.tar.gz" | sha256sum -c - \
    && tar -C /usr/local/bin -xzf /tmp/hugo.tar.gz hugo \
    && rm /tmp/hugo.tar.gz

WORKDIR /src
COPY . .
RUN hugo --gc --minify --baseURL "${BASEURL}" --config hugo.toml,deploy/finder-dev.toml

FROM nginx:1.27-alpine
COPY --from=build /src/public /usr/share/nginx/html
EXPOSE 80
