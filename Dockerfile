# ==============================================================================
# Multi-stage Dockerfile pour sansfile-client (Angular PWA servie par Nginx)
# ==============================================================================

# --- Étape 1 : Build Angular de production ---
FROM node:22-alpine AS builder
WORKDIR /app

# Dépendances d'abord (mise en cache Docker tant que le lockfile ne change pas)
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# --- Étape 2 : Image d'exécution Nginx ---
FROM nginx:stable-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY security-headers-base.conf security-headers.conf /etc/nginx/snippets/
COPY --from=builder /app/dist/sansfile-client/browser /usr/share/nginx/html

EXPOSE 80

# Santé lue par Docker (docker ps, déploiement, supervision)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1/ > /dev/null || exit 1
