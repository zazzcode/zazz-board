#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_REPO="${1:-${ZAZZ_SKILLS_REPO:-}}"

if [[ -z "${SOURCE_REPO}" ]]; then
  echo "Usage: $0 /absolute/path/to/zazz-skills" >&2
  echo "   or: ZAZZ_SKILLS_REPO=/absolute/path/to/zazz-skills $0" >&2
  exit 2
fi

if [[ ! -d "${SOURCE_REPO}/.agents/skills" ]]; then
  echo "Expected skills directory not found: ${SOURCE_REPO}/.agents/skills" >&2
  exit 2
fi

MANAGED_SKILLS=(
  coordinator
  feature-doc-builder
  planner
  pr-builder
  proposal-builder
  qa
  qa-backend
  qa-frontend
  spec-builder
  worker
  zazz-board-api
)

for skill in "${MANAGED_SKILLS[@]}"; do
  mkdir -p "${ROOT_DIR}/.agents/skills/${skill}"
  rsync -a --delete \
    "${SOURCE_REPO}/.agents/skills/${skill}/" \
    "${ROOT_DIR}/.agents/skills/${skill}/"
done

echo "Synced framework-managed skills from ${SOURCE_REPO}"
echo "Local-only skill left untouched: database-baseline-refresh"
