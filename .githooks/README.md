# Git Hooks for Branch Protection

This directory contains version-controlled git hooks to enforce the branch workflow described in [CLAUDE.md](../CLAUDE.md).

## Quick Setup

Run the installation script after cloning the repository:

```bash
./.githooks/install.sh
```

## Manual Installation

If you prefer to install manually:

```bash
cp .githooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

## What's Included

### pre-commit Hook

Prevents direct commits to protected branches (`main` and `development`).

**Protected branches:**
- `main`
- `development`

**What it does:**
- Checks current branch before allowing commit
- Blocks commits if on a protected branch
- Provides helpful error message with correct workflow
- Allows commits on all feature branches

**Example error message:**
```
❌ ERROR: Direct commits to 'main' are not allowed!

Please create a new branch first:
  git checkout -b claude/CRO-XXX-description

Or for non-Linear work:
  git checkout -b claude/fix-description

Commit aborted.
```

## Testing

To verify the hook is working:

```bash
# Should fail (on protected branch)
git checkout main
echo "test" > test.txt
git add test.txt
git commit -m "test"  # ❌ Should be blocked

# Should succeed (on feature branch)
git checkout -b test-branch
git commit -m "test"  # ✅ Should work

# Cleanup
git checkout main
git branch -D test-branch
rm test.txt
```

## Bypassing (Emergency Only)

In rare emergencies, you can bypass the hook:

```bash
git commit --no-verify -m "Emergency hotfix"
```

**⚠️ Warning:** Only use this for genuine emergencies. All changes should normally go through Pull Requests.

## For Team Members

After pulling these changes, run:

```bash
./.githooks/install.sh
```

This ensures everyone has the same git hooks installed.

## Updating Hooks

When hooks are updated in this directory:

1. Pull the latest changes
2. Re-run the installation script:
   ```bash
   ./.githooks/install.sh
   ```

## Why Git Hooks Aren't Automatic

Git doesn't automatically execute scripts from `.git/hooks/` because they could be malicious. That's why hooks live in `.githooks/` (version controlled) and need to be manually copied to `.git/hooks/`.

## Additional Resources

- See [.claude/BRANCH-ENFORCEMENT.md](../.claude/BRANCH-ENFORCEMENT.md) for all enforcement options
- See [CLAUDE.md](../CLAUDE.md) for complete git workflow guidelines
