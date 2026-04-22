#!/bin/bash
set -euo pipefail

ISSUE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_NAME="recharts-waterfall"

if command -v conda >/dev/null 2>&1; then
  # shellcheck disable=SC1091
  source "$(conda info --base)/etc/profile.d/conda.sh"
  if ! conda env list | awk '{print $1}' | grep -qx "$ENV_NAME"; then
    conda env create -f "$ISSUE_DIR/environment.yml"
  fi
  conda activate "$ENV_NAME"
fi

rm -rf "$ISSUE_DIR/workspace"
cp -r "$ISSUE_DIR/init" "$ISSUE_DIR/workspace"

cd "$ISSUE_DIR/workspace"
npm ci --ignore-scripts

echo "workspace has been recreated from init/ and dependencies are installed."
