#!/usr/bin/env bash
# Chạy agent service: ./run.sh (PORT mặc định 8001, override qua env PORT)
set -euo pipefail
cd "$(dirname "$0")"

UV_BIN="${UV_BIN:-$HOME/.local/bin/uv}"
PORT="${PORT:-8001}"

exec "$UV_BIN" run uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
