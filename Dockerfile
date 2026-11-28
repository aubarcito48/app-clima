# syntax=docker/dockerfile:1
FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# Public URL used by the visitor's browser, not a Docker service name.
ARG PUBLIC_API_BASE_URL_PRODUCTION=http://localhost:8000
RUN npm run build

FROM nginx:stable-alpine AS runtime
COPY docker/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/app-clima/browser /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
