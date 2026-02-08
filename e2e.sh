#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPASS_CLI_DIR="${COMPASS_CLI_DIR:-$SCRIPT_DIR/../compass}"

echo "==> Starting e2e stack..."
docker compose -f "$SCRIPT_DIR/docker-compose.e2e.yml" up -d --build --wait

cleanup() {
    echo "==> Tearing down e2e stack..."
    docker compose -f "$SCRIPT_DIR/docker-compose.e2e.yml" down -v
}
trap cleanup EXIT

echo "==> Running integration tests..."
cd "$COMPASS_CLI_DIR"
COMPASS_TEST_API_URL=http://localhost:3000 go test -tags integration -v -count=1 ./internal/store/
