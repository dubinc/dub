#!/usr/bin/env bash
# Emit apps/web paths relative to the DeepSec project root (apps/web).
# Usage: list-pr-files.sh <git-diff-range>
set -euo pipefail

range="${1:?git range required (e.g. origin/main...HEAD)}"
repo_root="$(cd "$(dirname "$0")/../.." && pwd)"

git -C "$repo_root" diff --name-only --diff-filter=ACMR "$range" -- apps/web \
  | sed 's|^apps/web/||' \
  | grep -vE '(^|/)(__tests__|e2e|playwright|fixtures|generated|\.next|playwright-report|test-results)/' \
  | grep -vE '\.(test|spec)\.(ts|tsx|js|jsx)$' \
  | grep -vE '(^|/)\.env($|\.)' \
  || true
