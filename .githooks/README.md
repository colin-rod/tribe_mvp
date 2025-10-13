# Git Hooks - Branch Protection & Automation

This directory contains Git hooks that enforce the Pull Request workflow for **all contributors**, including AI coding assistants (Claude Code, Codex) and human developers.

## 🎯 Purpose

These hooks **force** everyone (humans and AI) to:
1. Create a new branch BEFORE making any code changes
2. Never commit directly to `main` or `development`
3. Pass quality checks before pushing
4. Go through Pull Requests for all changes

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

## 🔒 What Gets Protected

These hooks **BLOCK** the following:
- ❌ Commits directly to `main` branch
- ❌ Commits directly to `development` branch
- ❌ Pushes from `main` branch
- ❌ Pushes from `development` branch
- ❌ Pushes that fail quality checks

## 📋 Installed Hooks

### 1. pre-commit
**Purpose**: Prevents commits to protected branches

**What it does:**
- Checks if current branch is `main` or `development`
- If protected: Blocks commit with detailed error message
- If feature branch: Allows commit with success message

**Error message includes:**
- Clear explanation of the violation
- Step-by-step instructions for creating feature branch
- Examples for Claude, Codex, and human developers
- Reference to documentation

**Example output:**
```
🚨 =====================================================================
   PROTECTED BRANCH: Direct commits to 'main' are BLOCKED
===================================================================== 🚨

This protection applies to ALL developers, Claude Code, and Codex.

📋 Required workflow:
   1. Create a new branch BEFORE making any code changes
   ...

🌿 For Claude Code:
   git checkout -b claude/CRO-XXX-description

🌿 For Codex:
   git checkout -b codex/feature-description

❌ Commit aborted - Create a branch first!
```

### 2. pre-push
**Purpose**: Ensures code quality and proper branching

**What it does:**
1. **Blocks pushes from protected branches**
2. **Auto-commits** any uncommitted changes
3. **Verifies branch ancestry**:
   - Regular branches must be based on `development`
   - `hotfix/` and `emergency/` must be based on `main`
4. **Runs quality checks**:
   - `npm run lint` - Code style and quality
   - `npx tsc --noEmit` - TypeScript type checking
5. **Blocks push** if any check fails

**Emergency override:**
```bash
SKIP_PUSH_CHECKS=1 git push
```
⚠️ Only for critical production issues!

### 3. post-push
**Purpose**: Automates Pull Request creation

**What it does:**
- Automatically creates PR after successful push
- Targets `development` for regular feature branches
- Targets `main` for `hotfix/` and `emergency/` branches
- Uses formatted PR template with proper attribution

## 🧪 Testing

Run the comprehensive test script:

```bash
./.githooks/test-protection.sh
```

This automatically tests:
1. ❌ Attempt to commit to `main` (should fail)
2. ❌ Attempt to commit to `development` (should fail)
3. ✅ Attempt to commit to feature branch (should succeed)

**Manual testing:**
```bash
# Should fail
git checkout main
echo "test" > test.txt
git add test.txt
git commit -m "test"  # ❌ Blocked

# Should succeed
git checkout -b test-branch
git commit -m "test"  # ✅ Allowed
```

## 🚀 How to Use

### For Claude Code
```bash
# 1. Check current branch
git branch --show-current

# 2. If on main/development, create branch immediately
git checkout -b claude/CRO-XXX-description

# 3. Make changes, commit, push
git add .
git commit -m "feat: Description"
git push  # PR created automatically!
```

### For GitHub Codex
```bash
# 1. Check current branch
git branch --show-current

# 2. If on main/development, create branch immediately
git checkout -b codex/feature-description

# 3. Make changes, commit, push
git add .
git commit -m "feat: Description"
git push  # PR created automatically!
```

### For Human Developers
```bash
# 1. Ensure you're on development
git checkout development
git pull --ff-only

# 2. Create feature branch
git checkout -b yourname/feature-description

# 3. Make changes, commit, push
git add .
git commit -m "feat: Description"
git push  # PR created automatically!
```

## 🌿 Branch Naming Conventions

| Prefix | Purpose | PR Target |
|--------|---------|-----------|
| `claude/*` | Claude Code work | `development` |
| `codex/*` | Codex work | `development` |
| `hotfix/*` | Production fixes | `main` |
| `emergency/*` | Critical issues | `main` |
| Other | Human developers | `development` |

**Examples:**
- `claude/CRO-293-add-feature` - Claude work on Linear issue
- `codex/refactor-auth-flow` - Codex refactoring
- `hotfix/security-patch` - Urgent production fix
- `john/add-user-settings` - Human developer feature

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

## 📚 Related Documentation

- **[CLAUDE.md](../CLAUDE.md)** - Complete git workflow for Claude Code
- **[CODEX.md](../CODEX.md)** - Complete git workflow for Codex
- **[.githooks/install.sh](./install.sh)** - Installation script
- **[.githooks/test-protection.sh](./test-protection.sh)** - Automated test script

## ✨ Benefits

### For Teams
- ✅ Consistent workflow across all contributors
- ✅ All changes go through code review
- ✅ Clear audit trail (who changed what)
- ✅ No accidental commits to protected branches

### For AI Assistants
- ✅ Forces proper branch creation
- ✅ Prevents conflicts between multiple AI tools
- ✅ Ensures code quality before pushing
- ✅ Maintains clean git history

### For Code Quality
- ✅ All code passes linting before push
- ✅ All code passes type checking before push
- ✅ Reduces bugs in shared branches
- ✅ Catches issues early in development

## 🔧 Troubleshooting

### Hook not executing
```bash
# Reinstall hooks
./.githooks/install.sh

# Verify executable permissions
ls -la .git/hooks/ | grep -E "(pre-commit|pre-push|post-push)"
```

### Quality checks failing
```bash
# Fix linting issues
npm run lint

# Fix type errors
npx tsc --noEmit

# Or emergency bypass (not recommended)
SKIP_PUSH_CHECKS=1 git push
```

### Accidentally on protected branch
```bash
# Check current branch
git branch --show-current

# If on main/development, create branch immediately
# (your changes are preserved)
git checkout -b your-prefix/feature-name

# Now you can commit
git add .
git commit -m "feat: Your changes"
```

## 🛠️ Maintenance

### Updating Hooks
1. Edit hook file in `.githooks/` directory
2. Run `./.githooks/install.sh` to copy to `.git/hooks/`
3. Test with `./.githooks/test-protection.sh`
4. Commit hook files to repository

### Disabling Hooks (Not Recommended)
```bash
# Remove hooks
rm .git/hooks/pre-commit .git/hooks/pre-push .git/hooks/post-push

# To re-enable later
./.githooks/install.sh
```

## 🎯 Philosophy

These hooks exist to:
1. **Prevent mistakes** before they happen
2. **Enforce best practices** automatically
3. **Maintain code quality** without manual intervention
4. **Enable collaboration** between humans and AI tools
5. **Protect production** branches from direct changes

The hooks are intentionally strict but provide clear, actionable guidance when blocking operations.
