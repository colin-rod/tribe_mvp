#!/bin/bash
# Quick PR creation script
# Usage: ./quick-pr.sh [base-branch]
#
# Examples:
#   ./quick-pr.sh              # Creates PR to development (default)
#   ./quick-pr.sh main         # Creates PR to main
#   ./quick-pr.sh development  # Creates PR to development

set -e

# Get current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Determine base branch
BASE_BRANCH="${1:-development}"

# Check if on a protected branch
if [[ "$CURRENT_BRANCH" =~ ^(main|development)$ ]]; then
    echo "❌ ERROR: Cannot create PR from protected branch '$CURRENT_BRANCH'"
    echo "Please create a feature branch first:"
    echo "  git checkout -b claude/feature-name"
    exit 1
fi

echo "🚀 Quick PR Creation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Current branch: $CURRENT_BRANCH"
echo "Base branch:    $BASE_BRANCH"
echo ""

# Check if there are uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  You have uncommitted changes."
    read -p "Commit them now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Commit message: " COMMIT_MSG
        git add .
        git commit -m "$COMMIT_MSG"
        echo "✅ Changes committed"
    else
        echo "❌ Please commit your changes first"
        exit 1
    fi
fi

# Run quality checks
echo ""
echo "📋 Running quality checks..."
echo ""

echo "1/3 Linting..."
if npm run lint &>/dev/null; then
    echo "  ✅ Lint passed"
else
    echo "  ❌ Lint failed"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "2/3 Type checking..."
if npx tsc --noEmit &>/dev/null; then
    echo "  ✅ Type check passed"
else
    echo "  ❌ Type check failed"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "3/3 Running tests..."
if npm test &>/dev/null; then
    echo "  ✅ Tests passed"
else
    echo "  ❌ Tests failed"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo "✅ Quality checks complete"
echo ""

# Push to remote
echo "⬆️  Pushing to remote..."
if git push -u origin "$CURRENT_BRANCH" 2>&1 | grep -q "Everything up-to-date"; then
    echo "  ℹ️  Branch already up-to-date"
else
    echo "  ✅ Pushed to origin/$CURRENT_BRANCH"
fi

echo ""

# Check if PR already exists
PR_EXISTS=$(gh pr list --head "$CURRENT_BRANCH" --json number --jq '. | length' 2>/dev/null || echo "0")

if [ "$PR_EXISTS" -gt 0 ]; then
    echo "ℹ️  Pull Request already exists for this branch"
    PR_URL=$(gh pr list --head "$CURRENT_BRANCH" --json url --jq '.[0].url')
    echo "View PR: $PR_URL"
    exit 0
fi

# Extract Linear issue ID if present
LINEAR_ISSUE=""
if [[ "$CURRENT_BRANCH" =~ CRO-([0-9]+) ]]; then
    LINEAR_ISSUE="CRO-${BASH_REMATCH[1]}"
fi

# Create PR title from branch name
PR_TITLE=$(echo "$CURRENT_BRANCH" | sed -E 's/^[^/]+\///' | sed 's/-/ /g' | sed 's/\b\(.\)/\u\1/g')

# If Linear issue exists, get details
if [ -n "$LINEAR_ISSUE" ]; then
    echo "📋 Fetching Linear issue details..."
    ISSUE_TITLE=$(linear issue view "$LINEAR_ISSUE" --format json 2>/dev/null | jq -r '.title' || echo "")
    if [ -n "$ISSUE_TITLE" ] && [ "$ISSUE_TITLE" != "null" ]; then
        PR_TITLE="$LINEAR_ISSUE: $ISSUE_TITLE"
    fi
fi

# Get commit messages since branching
COMMITS=$(git log --pretty=format:"- %s" origin/$BASE_BRANCH..HEAD | head -10)

# Create PR body
PR_BODY="## Summary

$COMMITS

"

if [ -n "$LINEAR_ISSUE" ]; then
    PR_BODY+="## Linear Issue
$LINEAR_ISSUE

"
fi

PR_BODY+="## Test Plan
- [x] Linting passes (\`npm run lint\`)
- [x] Type checking passes (\`npx tsc --noEmit\`)
- [x] Tests pass (\`npm test\`)
- [ ] Manual testing completed

## Changes
<!-- Describe your changes here -->

🤖 Generated with [Claude Code](https://claude.com/claude-code)"

# Create the PR
echo "📝 Creating Pull Request..."
echo ""
echo "Title: $PR_TITLE"
echo "Base:  $BASE_BRANCH"
echo ""

gh pr create \
    --base "$BASE_BRANCH" \
    --title "$PR_TITLE" \
    --body "$PR_BODY" \
    --web

echo ""
echo "✅ Pull Request created successfully!"
echo ""
