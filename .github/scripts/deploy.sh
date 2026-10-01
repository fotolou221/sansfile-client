#!/usr/bin/env bash
# ==============================================================================
# Déploiement d'un service SansFile sur le VPS — exécuté à distance par la CI (SSH)
#
#   deploy.sh <service> <image distante> <dossier de l'application>
#   ex. deploy.sh sansfile-backend ghcr.io/proprio/sansfile-backend:sha-<commit> /opt/sansfile
#
# 1. Télécharge l'image construite et testée par la CI
# 2. La renomme <service>:prod (nom utilisé par docker-compose.yml) et garde l'ancienne en <service>:previous
# 3. Redémarre uniquement ce service (base, cache et autre service ne sont pas touchés)
# 4. Attend que Docker le déclare « healthy » (HEALTHCHECK du Dockerfile)
# En cas d'échec : retour automatique à la version précédente, et la CI passe en rouge.
# ==============================================================================
set -euo pipefail

SERVICE="$1"
REMOTE_IMAGE="$2"
APP_DIR="$3"

CURRENT="${SERVICE}:prod"
PREVIOUS="${SERVICE}:previous"
TIMEOUT_SECONDS=300

cd "$APP_DIR"

restart_service() {
  docker compose up -d --no-deps --no-build "$SERVICE"
}

wait_until_healthy() {
  local waited=0 status
  while [ "$waited" -lt "$TIMEOUT_SECONDS" ]; do
    status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$SERVICE" 2> /dev/null || echo absent)"
    case "$status" in
      healthy) return 0 ;;
      unhealthy | exited | dead) return 1 ;;
    esac
    sleep 5
    waited=$((waited + 5))
  done
  return 1
}

echo "▶ Téléchargement de $REMOTE_IMAGE"
docker pull --quiet "$REMOTE_IMAGE"

if docker image inspect "$CURRENT" > /dev/null 2>&1; then
  docker tag "$CURRENT" "$PREVIOUS"
fi
docker tag "$REMOTE_IMAGE" "$CURRENT"
# Seuls les tags prod et previous restent sur le serveur
docker rmi "$REMOTE_IMAGE" > /dev/null

echo "▶ Redémarrage de $SERVICE"
restart_service

if wait_until_healthy; then
  docker image prune -f > /dev/null
  echo "✅ $SERVICE déployé : $REMOTE_IMAGE"
  exit 0
fi

echo "❌ $SERVICE ne répond pas correctement : retour à la version précédente" >&2
docker compose logs --tail=80 "$SERVICE" >&2 || true
if docker image inspect "$PREVIOUS" > /dev/null 2>&1; then
  docker tag "$PREVIOUS" "$CURRENT"
  restart_service
  if wait_until_healthy; then
    echo "↩ Version précédente rétablie" >&2
  else
    echo "⚠ La version précédente ne répond pas non plus : intervention manuelle nécessaire" >&2
  fi
fi
exit 1
