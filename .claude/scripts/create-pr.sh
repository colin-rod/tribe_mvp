#!/usr/bin/env bash
#
# Claude Code PR Creation Helper Script
#
# Usage:
#   ./create-pr.sh [LINEAR_ISSUE_ID] [SHORT_DESCRIPTION]
#   ./create-pr.sh CRO-293 "add-memory-metadata"
#   ./create-pr.sh fix "auth-redirect-loop"
#
# This script:
# 1. Creates a new branch with claude/ prefix
# 2. Runs quality checks (lint, type-check, tests)
# 3. Commits staged changes
# 4. Pushes to remote
# 5. Opens a Pull Request

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_info() {
    echo -e "${BLUE}ℹ ${1}${NC}"
}

print_success() {
    echo -e "${GREEN}✓ ${1}${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ ${1}${NC}"
}

print_error() {
    echo -e "${RED}✗ ${1}${NC}"
}

print_section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}${1}${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# Check if gh CLI is installed and authenticated
check_gh_cli() {
    if ! command -v gh &> /dev/null; then
        print_error "GitHub CLI (gh) is not installed"
        print_info "Install with: brew install gh"
        exit 1
    fi

    if ! gh auth status &> /dev/null; then
        print_error "GitHub CLI is not authenticated"
        print_info "Authenticate with: gh auth login"
        exit 1
    fi
}

# Parse arguments
ISSUE_ID="${1:-}"
DESCRIPTION="${2:-}"

if [ -z "$ISSUE_ID" ] || [ -z "$DESCRIPTION" ]; then
    print_error "Usage: $0 [LINEAR_ISSUE_ID] [SHORT_DESCRIPTION]"
    echo ""
    echo "Examples:"
    echo "  $0 CRO-293 \"add-memory-metadata\""
    echo "  $0 fix \"auth-redirect-loop\""
    echo "  $0 feature \"profile-settings\""
    echo "  $0 refactor \"api-handlers\""
    exit 1
fi

# Construct branch name
if [[ "$ISSUE_ID" =~ ^CRO-[0-9]+$ ]]; then
    BRANCH_NAME="claude/${ISSUE_ID}-${DESCRIPTION}"
    PR_TITLE="feat: ${DESCRIPTION//-/ }"
else
    BRANCH_NAME="claude/${ISSUE_ID}-${DESCRIPTION}"
    PR_TITLE="${ISSUE_ID}: ${DESCRIPTION//-/ }"
fi

print_section "Claude Code PR Creation Workflow"
print_info "Branch: ${BRANCH_NAME}"
print_info "Title: ${PR_TITLE}"

# Check for uncommitted changes
print_section "Step 1: Checking Git Status"
if [[ -z $(git status -s) ]]; then
    print_warning "No changes detected. Nothing to commit."
    exit 0
fi

print_success "Changes detected:"
git status -s

# Create and checkout new branch
print_section "Step 2: Creating Feature Branch"
CURRENT_BRANCH=$(git branch --show-current)
print_info "Current branch: ${CURRENT_BRANCH}"

# Check if branch already exists
if git show-ref --verify --quiet "refs/heads/${BRANCH_NAME}"; then
    print_warning "Branch ${BRANCH_NAME} already exists"
    print_info "Checking out existing branch..."
    git checkout "${BRANCH_NAME}"
else
    print_info "Creating new branch: ${BRANCH_NAME}"
    git checkout -b "${BRANCH_NAME}"
    print_success "Branch created"
fi

# Run quality checks
print_section "Step 3: Running Quality Checks"

print_info "Running linter..."
if npm run lint; then
    print_success "Linting passed"
else
    print_error "Linting failed"
    print_info "Please fix linting errors before creating PR"
    exit 1
fi

print_info "Running type checks..."
if npx tsc --noEmit; then
    print_success "Type checking passed"
else
    print_error "Type checking failed"
    print_info "Please fix type errors before creating PR"
    exit 1
fi

print_info "Running tests..."
if npm test; then
    print_success "Tests passed"
else
    print_error "Tests failed"
    print_info "Please fix failing tests before creating PR"
    exit 1
fi

print_success "All quality checks passed!"

# Stage and commit changes
print_section "Step 4: Committing Changes"

git add .

# Construct commit message
if [[ "$ISSUE_ID" =~ ^CRO-[0-9]+$ ]]; then
    # Fetch Linear issue details if available
    if command -v linear &> /dev/null; then
        print_info "Fetching Linear issue details..."
        ISSUE_TITLE=$(linear issue view "$ISSUE_ID" --json | grep -o '"title":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "")
        if [ -n "$ISSUE_TITLE" ]; then
            print_info "Issue: ${ISSUE_TITLE}"
        fi
    fi

    COMMIT_MESSAGE="feat: ${DESCRIPTION//-/ }

Refs: ${ISSUE_ID}"
else
    COMMIT_MESSAGE="${ISSUE_ID}: ${DESCRIPTION//-/ }"
fi

git commit -m "${COMMIT_MESSAGE}"
print_success "Changes committed"

# Push to remote
print_section "Step 5: Pushing to Remote"
print_info "Pushing branch to origin..."
git push -u origin "${BRANCH_NAME}"
print_success "Branch pushed successfully"

# Create Pull Request
print_section "Step 6: Creating Pull Request"

# Construct PR body
PR_BODY="## Summary

Changes made by Claude Code.

"

if [[ "$ISSUE_ID" =~ ^CRO-[0-9]+$ ]]; then
    PR_BODY+="## Linear Issue

${ISSUE_ID}"
    if [ -n "${ISSUE_TITLE:-}" ]; then
        PR_BODY+=": ${ISSUE_TITLE}"
    fi
    PR_BODY+="

"
fi

PR_BODY+="## Changes

- ${DESCRIPTION//-/ }

## Test Plan

- ✅ Linting passed
- ✅ Type checking passed
- ✅ Unit tests passed

## Quality Checks

All required quality checks have been completed successfully.

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)"

# Determine base branch (default to development)
BASE_BRANCH="development"
if git show-ref --verify --quiet "refs/remotes/origin/development"; then
    BASE_BRANCH="development"
elif git show-ref --verify --quiet "refs/remotes/origin/main"; then
    BASE_BRANCH="main"
fi

print_info "Base branch: ${BASE_BRANCH}"

# Create PR
print_info "Creating Pull Request..."
PR_URL=$(gh pr create \
    --title "${PR_TITLE}" \
    --body "${PR_BODY}" \
    --base "${BASE_BRANCH}" \
    --head "${BRANCH_NAME}" \
    --label "claude")

print_success "Pull Request created!"
print_success "Claude label automatically added"
echo ""
print_info "PR URL: ${PR_URL}"
echo ""

# Open PR in browser (optional)
read -p "Open PR in browser? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    gh pr view --web
fi

print_section "✓ Workflow Complete"
print_success "Your Pull Request is ready for review!"
print_info "Next steps:"
echo "  1. CI/CD will run automatically"
echo "  2. Request review from team members"
echo "  3. Address any feedback"
echo "  4. Merge when approved"
echo ""
