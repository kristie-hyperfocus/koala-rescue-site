#!/usr/bin/env bash
# Grants someone (e.g. Richard) collaborator access to this repo on GitHub, so their
# own Claude Code / git setup can actually push branches and open PRs.
#
# Usage:
#   ./scripts/grant-collaborator.sh <their-github-username>
#
# Requires the GitHub CLI (gh), authenticated as an owner/admin of this repo
# (kristie-hyperfocus/koala-rescue-site). Grants "push" access — can branch, commit,
# and open PRs, but not change repo settings or collaborators themselves.

set -euo pipefail

REPO="kristie-hyperfocus/koala-rescue-site"
PERMISSION="push"

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <github-username>" >&2
  exit 1
fi

USERNAME="$1"

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI (gh) isn't installed. Install it from https://cli.github.com, then run 'gh auth login'." >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Not logged in to gh. Run 'gh auth login' first." >&2
  exit 1
fi

echo "Checking GitHub user '$USERNAME' exists..."
if ! gh api "users/$USERNAME" >/dev/null 2>&1; then
  echo "No GitHub user found with username '$USERNAME'. Double-check the spelling." >&2
  exit 1
fi

echo "Inviting '$USERNAME' to $REPO with '$PERMISSION' access..."
gh api --method PUT "repos/$REPO/collaborators/$USERNAME" -f permission="$PERMISSION"

echo
echo "Done. GitHub will email '$USERNAME' an invite — they need to accept it before"
echo "access actually works (an invite alone doesn't grant anything until accepted)."
echo "Next: point them at RICHARD-GUIDE.md, or have them run the krbs-setup skill once"
echo "they've accepted the invite and cloned the repo."
