#!/bin/bash
# Test script to demonstrate Git hook protection
# This shows what happens when trying to commit/push to protected branches

set -e

echo "============================================"
echo "Git Hook Protection Test"
echo "============================================"
echo ""

# Save current branch
ORIGINAL_BRANCH=$(git branch --show-current)
echo "📍 Current branch: $ORIGINAL_BRANCH"
echo ""

# Test 1: Try to commit on main (should fail)
echo "Test 1: Attempting to commit directly to 'main' branch..."
echo "---"
git checkout main 2>/dev/null || git checkout -b main 2>/dev/null || true
echo "Creating a test file..."
echo "test" > .git-hook-test-file.txt
git add .git-hook-test-file.txt

echo "Attempting commit (this should be BLOCKED)..."
if git commit -m "test: This should be blocked" 2>&1; then
    echo "❌ FAILED: Commit to main was NOT blocked!"
    exit 1
else
    echo "✅ PASSED: Commit to main was blocked as expected"
fi
echo ""

# Clean up test file
git reset HEAD .git-hook-test-file.txt 2>/dev/null || true
rm -f .git-hook-test-file.txt

# Test 2: Try to commit on development (should fail)
echo "Test 2: Attempting to commit directly to 'development' branch..."
echo "---"
git checkout development 2>/dev/null || git checkout -b development 2>/dev/null || true
echo "Creating a test file..."
echo "test" > .git-hook-test-file.txt
git add .git-hook-test-file.txt

echo "Attempting commit (this should be BLOCKED)..."
if git commit -m "test: This should be blocked" 2>&1; then
    echo "❌ FAILED: Commit to development was NOT blocked!"
    exit 1
else
    echo "✅ PASSED: Commit to development was blocked as expected"
fi
echo ""

# Clean up test file
git reset HEAD .git-hook-test-file.txt 2>/dev/null || true
rm -f .git-hook-test-file.txt

# Test 3: Commit on feature branch (should succeed)
echo "Test 3: Attempting to commit on feature branch..."
echo "---"
TEST_BRANCH="test/git-hook-verification-$$"
git checkout -b "$TEST_BRANCH" 2>/dev/null || true
echo "test" > .git-hook-test-file.txt
git add .git-hook-test-file.txt

echo "Attempting commit (this should SUCCEED)..."
if git commit -m "test: Feature branch commit" 2>&1; then
    echo "✅ PASSED: Commit to feature branch succeeded"
else
    echo "❌ FAILED: Commit to feature branch was blocked!"
    exit 1
fi
echo ""

# Clean up
echo "Cleaning up test branch..."
git checkout "$ORIGINAL_BRANCH" 2>/dev/null || git checkout main 2>/dev/null || true
git branch -D "$TEST_BRANCH" 2>/dev/null || true
rm -f .git-hook-test-file.txt

echo ""
echo "============================================"
echo "✅ All Tests Passed!"
echo "============================================"
echo ""
echo "Summary:"
echo "  ✅ Commits to 'main' are blocked"
echo "  ✅ Commits to 'development' are blocked"
echo "  ✅ Commits to feature branches are allowed"
echo ""
echo "Git hooks are working correctly!"
echo ""
