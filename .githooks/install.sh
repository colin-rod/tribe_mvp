#!/bin/bash
# Install git hooks for branch protection
# Run this script after cloning the repository

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GIT_HOOKS_DIR="$(git rev-parse --git-dir)/hooks"

echo "Installing git hooks for branch protection..."

# Install pre-commit hook
cp "$SCRIPT_DIR/pre-commit" "$GIT_HOOKS_DIR/pre-commit"
chmod +x "$GIT_HOOKS_DIR/pre-commit"

echo "✅ Pre-commit hook installed successfully!"
echo ""
echo "This hook will prevent direct commits to 'main' and 'development' branches."
echo "All changes must go through Pull Requests."
echo ""
echo "See CLAUDE.md for full git workflow guidelines."
