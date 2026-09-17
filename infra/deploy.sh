#!/usr/bin/env bash
# Деплой на домашний сервер: git pull, сборка образа, перезапуск.
#   ssh homesrv 'cd ~/max-chat && infra/deploy.sh'
set -euo pipefail
cd "$(dirname "$0")/.."
git pull --ff-only
BIND="${BIND:-100.104.231.20:3300}" docker compose -f infra/docker-compose.yml up -d --build
docker image prune -f >/dev/null
echo "ok: $(git rev-parse --short HEAD)"
