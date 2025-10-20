#!/bin/bash
# Install git hooks for branch protection
# Run this script after cloning the repository

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GIT_HOOKS_DIR="$(git rev-parse --git-dir)/hooks"

echo "Installing git hooks for branch protection and automation..."

HOOKS=("pre-commit" "pre-push" "post-push")

for HOOK in "${HOOKS[@]}"; do
    SOURCE="$SCRIPT_DIR/$HOOK"
    TARGET="$GIT_HOOKS_DIR/$HOOK"

    if [[ -f "$SOURCE" ]]; then
        cp "$SOURCE" "$TARGET"
        chmod +x "$TARGET"
        echo "✅ Installed $HOOK hook"
    else
        echo "⚠️  Skipped $HOOK — source file not found at $SOURCE"
    fi
done

cat <<'EOF'

Installed hooks:
  • pre-commit  – blocks commits to protected branches
  • pre-push    – enforces branching off development & runs lint/type checks
  • post-push   – auto-creates Pull Requests targeting development

All changes must go through feature branches and pass quality checks before PR creation.
See CLAUDE.md for full git workflow guidelines.
EOF
