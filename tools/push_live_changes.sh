#!/usr/bin/env bash
set -euo pipefail

LIVE="/var/www/vhosts/mastergolfclub.com/httpdocs/django/src"
REPO="/var/www/vhosts/mastergolfclub.com/httpdocs-git"
PLESK_USER="mastergolfclub.com_qvo6e6uw5ps"

if [ "$(id -un)" != "$PLESK_USER" ]; then
  exec sudo -u "$PLESK_USER" -H "$0" "$@"
fi

mode="${1:-preview}"  # use "push" to commit and push; default shows preview

cd "$REPO"
# Get latest changes
(git pull --rebase || true) >/dev/null 2>&1

# Sync live files into repo (exclude runtime artifacts and tools)
rsync -a --delete \
  --exclude ".git" \
  --exclude ".idea/" \
  --exclude "media/" \
  --exclude "staticfiles/" \
  --exclude "db.sqlite3" \
  --exclude "venv/" \
  --exclude ".venv/" \
  --exclude "tools/" \
  --exclude "__pycache__/" \
  --exclude "*.pyc" \
  "$LIVE/" "$REPO/"

# Show what would be committed
git status -sb

if [ "$mode" = "push" ]; then
  if ! git config user.name >/dev/null 2>&1; then git config user.name "server-operator"; fi
  if ! git config user.email >/dev/null 2>&1; then git config user.email "ops@mastergolfclub.com"; fi
  git add -A
  git commit -m "Server sync: $(date -Iseconds)" || true
  git push || true
fi
