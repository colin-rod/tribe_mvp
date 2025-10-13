# CODEX.md

This file provides guidance to GitHub Codex when working with code in this repository.

## 🚨 CRITICAL: Branch Creation Required

**BEFORE MAKING ANY CODE CHANGES**, you MUST create a new feature branch:

```bash
# Check current branch first
git branch --show-current

# If on 'main' or 'development', create a new branch immediately
git checkout -b codex/feature-description
```

**NO EXCEPTIONS**: All code changes must go through Pull Requests. Direct commits to `main` and `development` are **BLOCKED** by Git hooks.

## Branch Naming Convention

Use the `codex/` prefix for all your branches:

- **Features**: `codex/feature-description`
  - Example: `codex/add-user-authentication`
- **Bug Fixes**: `codex/fix-description`
  - Example: `codex/fix-memory-leak`
- **Refactoring**: `codex/refactor-description`
  - Example: `codex/refactor-api-handlers`
- **Hotfixes** (targets main): `hotfix/critical-description`
  - Example: `hotfix/security-vulnerability`

## Workflow

1. **Create Branch** (BEFORE any code edits)
   ```bash
   git checkout development
   git pull --ff-only
   git checkout -b codex/feature-description
   ```

2. **Make Changes**
   - Edit files
   - Write code
   - Add tests

3. **Quality Checks** (Automated in pre-push hook)
   ```bash
   npm run lint
   npx tsc --noEmit
   npm test
   ```

4. **Commit**
   ```bash
   git add .
   git commit -m "feat: Description of changes

   - Detail 1
   - Detail 2

   Co-Authored-By: GitHub Codex <noreply@github.com>"
   ```

5. **Push** (Triggers automatic PR creation)
   ```bash
   git push -u origin codex/feature-description
   ```

## Automated Protection

This repository enforces the PR workflow through Git hooks:

### Pre-Commit Hook
- ❌ **BLOCKS** commits to `main` and `development`
- ✅ Only allows commits on feature branches
- 📋 Shows clear error message with instructions

### Pre-Push Hook
- ❌ **BLOCKS** pushes from `main` and `development`
- 📝 Auto-commits any uncommitted changes before push
- 🔍 Verifies branch is based on `development` (or `main` for hotfix)
- ✅ Runs `npm run lint` and `npx tsc --noEmit`
- ❌ Push fails if quality checks don't pass

### Post-Push Hook
- 🎯 Automatically creates Pull Request to `development`
- 📝 Uses formatted PR template
- 🤖 Includes proper attribution

## Quality Standards

All code must pass:
- ✅ **Linting**: `npm run lint` (no errors)
- ✅ **Type Checking**: `npx tsc --noEmit` (no errors)
- ✅ **Tests**: `npm test` (all passing)

## Linear Integration

Reference Linear issues in commits and PRs:

```bash
git commit -m "feat: Add feature X

Implements new functionality for feature X.

Refs: CRO-XXX"
```

View Linear issues:
```bash
linear issues view CRO-XXX
```

## Common Scenarios

### Scenario 1: Starting New Work
```bash
# 1. Ensure you're on development and up to date
git checkout development
git pull --ff-only

# 2. Create feature branch
git checkout -b codex/new-feature

# 3. Make changes
# ... edit files ...

# 4. Commit and push
git add .
git commit -m "feat: Implement new feature"
git push -u origin codex/new-feature
# PR is created automatically!
```

### Scenario 2: Accidentally on Protected Branch
```bash
# If you realize you're on main or development:
git status  # Shows: On branch main

# Create branch immediately (saves current changes)
git checkout -b codex/fix-issue

# Continue working normally
```

### Scenario 3: Quality Checks Fail
```bash
# Pre-push hook catches issues:
❌ npm run lint failed

# Fix the issues
npm run lint  # See errors
# Fix code...

# Try pushing again
git add .
git commit -m "fix: Resolve lint errors"
git push  # Will run checks again
```

## Emergency Override

In rare emergencies, you can skip pre-push checks:

```bash
SKIP_PUSH_CHECKS=1 git push
```

**⚠️ WARNING**: Only use this for critical production issues. You'll still need to fix quality issues before the PR can be merged.

## Multi-Agent Collaboration

This repository is used by:
- **Claude Code**: Uses `claude/` prefix
- **GitHub Codex**: Uses `codex/` prefix (you!)
- **Human developers**: Use their name prefix

All agents follow the same PR workflow to prevent conflicts.

## Help

- **Git Hooks Documentation**: See [CLAUDE.md](CLAUDE.md) Git Workflow section
- **Quality Standards**: See [CLAUDE.md](CLAUDE.md) Code Quality Standards section
- **Linear Integration**: See [CLAUDE.md](CLAUDE.md) Linear Integration section

## Summary

✅ **DO**:
- Create `codex/` branch BEFORE editing files
- Run quality checks before pushing
- Include descriptive commit messages
- Reference Linear issues when applicable

❌ **DON'T**:
- Commit directly to `main` or `development` (blocked)
- Push without passing quality checks (blocked)
- Skip branch creation for "quick fixes" (blocked)
- Try to bypass Git hooks (intentionally difficult)

**Remember**: Git hooks will block non-compliant operations and show you exactly what to do. Follow the instructions in the error messages.
