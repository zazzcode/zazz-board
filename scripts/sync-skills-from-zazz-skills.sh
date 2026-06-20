#!/usr/bin/env bash

# Sync framework-managed skills from the canonical zazz-skills repo into this repo.
#
# Usage:
#   ./scripts/sync-skills-from-zazz-skills.sh /absolute/path/to/zazz-skills
#   ZAZZ_SKILLS_REPO=/absolute/path/to/zazz-skills ./scripts/sync-skills-from-zazz-skills.sh
#
# Behavior:
#   - Discovers every skill under <source>/.agents/skills/ and mirrors it here.
#   - Skips any skill listed in IGNORE_SKILLS (skills this project does not use).
#   - Never touches skills listed in LOCAL_ONLY_SKILLS (repo-owned, not upstream).
#   - Removes a previously-synced skill that is no longer in upstream AND not
#     local-only, so obsolete skills (e.g. qa / qa-backend / qa-frontend, which
#     upstream consolidated into qa-testing) do not linger.
#   - Prints a summary of what was synced, skipped, preserved, and removed.
#
# To preview without writing, set DRY_RUN=1.

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

SRC_SKILLS="${SOURCE_REPO}/.agents/skills"
DST_SKILLS="${ROOT_DIR}/.agents/skills"
mkdir -p "${DST_SKILLS}"

# Skills this project intentionally does NOT vendor from upstream.
# Edit this list as the project's needs change. Each entry is a skill directory name.
IGNORE_SKILLS=(
  sqlcmd      # SQL Server diagnostics; this repo uses PostgreSQL (see psql skill)
  jira-api    # Jira-backed tracker support; this repo uses Zazz Board (zazz-board-api)
)

# Skills owned by this repo and never touched by an upstream sync.
LOCAL_ONLY_SKILLS=(
  worker                      # core to zazz-board's dogfooded workflow; not in upstream
  database-baseline-refresh   # local-only DB seed baseline skill
)

DRY_RUN="${DRY_RUN:-0}"

# Discover the set of upstream skill names (directory basenames).
mapfile -t UPSTREAM_SKILLS < <(find "${SRC_SKILLS}" -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | sort)

# Build ignore and local-only lookup sets for fast membership tests.
declare -A IGNORE_SET=()
for s in "${IGNORE_SKILLS[@]}"; do IGNORE_SET["$s"]=1; done
declare -A LOCAL_SET=()
for s in "${LOCAL_ONLY_SKILLS[@]}"; do LOCAL_SET["$s"]=1; done

synced=()
skipped=()
removed=()

for skill in "${UPSTREAM_SKILLS[@]}"; do
  if [[ -n "${IGNORE_SET[$skill]:-}" ]]; then
    skipped+=("ignored: ${skill}")
    continue
  fi
  if [[ "${DRY_RUN}" == "1" ]]; then
    synced+=("would sync: ${skill}")
    continue
  fi
  mkdir -p "${DST_SKILLS}/${skill}"
  rsync -a --delete "${SRC_SKILLS}/${skill}/" "${DST_SKILLS}/${skill}/"
  synced+=("synced: ${skill}")
done

# Remove previously-synced skills that upstream no longer ships and that are not local-only.
if [[ "${DRY_RUN}" != "1" ]]; then
  while IFS= read -r existing; do
    name="$(basename "${existing}")"
    if [[ -n "${LOCAL_SET[$name]:-}" ]]; then
      continue
    fi
    if [[ -n "${IGNORE_SET[$name]:-}" ]]; then
      continue
    fi
    if [[ ! -d "${SRC_SKILLS}/${name}" ]]; then
      rm -rf "${DST_SKILLS}/${name}"
      removed+=("removed (obsolete): ${name}")
    fi
  done < <(find "${DST_SKILLS}" -mindepth 1 -maxdepth 1 -type d)
fi

echo "Synced framework-managed skills from ${SOURCE_REPO}"
echo "  synced:   ${#synced[@]}"
for line in "${synced[@]:-}"; do echo "    ${line}"; done
echo "  skipped:  ${#skipped[@]}"
for line in "${skipped[@]:-}"; do echo "    ${line}"; done
echo "  removed:  ${#removed[@]}"
for line in "${removed[@]:-}"; do echo "    ${line}"; done
echo "Local-only skills left untouched: ${LOCAL_ONLY_SKILLS[*]}"
if [[ "${DRY_RUN}" == "1" ]]; then
  echo "(dry run; no changes written)"
fi
