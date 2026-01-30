#!/usr/bin/env bash

#omgcmd { overwrite: false }

# Copyright (C) 2022 One More Game - All Rights Reserved
# Unauthorized copying of this file, via any medium is strictly prohibited
# Proprietary and confidential
#
# shellcheck disable=SC1090

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly SCRIPT_DIR
WORKSPACE="$(realpath "$SCRIPT_DIR/../..")"
readonly WORKSPACE
readonly PUBLISH_SCRIPT="$WORKSPACE/bin/publish"

echo "--- clean out dir"
rm -rf dist
mkdir -p dist

echo "--- download artifacts"
buildkite-agent artifact download "dist/*" . || true

OUTPUT_FILES="$(find ./dist -type f)"
readonly OUTPUT_FILES

if [[ -z "${OUTPUT_FILES:+x}" ]]; then
  echo "No output files to publish"
  exit 0
fi

echo "--- get meta-data"
VERSION="$(buildkite-agent meta-data get "version")"
export readonly VERSION

if [[ -s "$PUBLISH_SCRIPT" ]]; then
  echo "--- publish"
  "$PUBLISH_SCRIPT" "$@"
fi
