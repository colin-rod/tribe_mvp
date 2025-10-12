# VS Code PR Workflow Guide

## Overview

This guide explains how to work with the automated PR workflow in VS Code. All PRs are automatically configured to target the `development` branch by default.

## ✅ What's Configured

### Git Settings
- ✅ Default base branch: `development`
- ✅ Auto-setup remote tracking branches
- ✅ Auto-setup merge configuration
- ✅ Protected branches: `main`, `development`

### Git Hooks
- ✅ **Pre-commit**: Blocks direct commits to protected branches
- ✅ **Post-push**: Automatically creates PRs after pushing

### VS Code Settings
- ✅ Branch protection warnings
- ✅ Format on save
- ✅ ESLint auto-fix on save
- ✅ GitHub PR extension integration

## 🚀 Quick Workflow

### Option 1: Use the Quick PR Script (Recommended)

```bash
# Run quality checks, push, and create PR to development
npm run pr

# Or create PR to main (for hotfixes only)
npm run pr:main
```

This script will:
1. Check for uncommitted changes
2. Run lint, type-check, and tests
3. Push to remote
4. Create PR with auto-generated title and description
5. Open PR in browser

### Option 2: Use VS Code Tasks

Press `Cmd+Shift+P` → "Tasks: Run Task" → Select:
- **"Push and Create PR"** - Push and create PR to development
- **"Create Pull Request"** - Just create PR (if already pushed)
- **"Quality Check"** - Run lint, type-check, and tests

### Option 3: Manual Git Commands

```bash
# 1. Create feature branch
git checkout -b claude/feature-name

# 2. Make changes and commit
git add .
git commit -m "feat: description"

# 3. Push (will auto-create PR via post-push hook)
git push -u origin claude/feature-name

# The post-push hook will automatically create a PR to development
```

### Option 4: VS Code Git UI

1. **Make changes** in VS Code
2. **Stage changes** (click + icon in Source Control)
3. **Write commit message** in the input box
4. **Click "Commit"** button
5. **Click "Sync Changes"** or "Push" button
6. **PR is automatically created** via post-push hook!

## 📋 Workflow Examples

### Creating a New Feature

```bash
# Start from development
git checkout development
git pull

# Create feature branch
git checkout -b claude/CRO-123-new-feature

# Make changes, then use quick PR
npm run pr
```

### Quick Fix

```bash
# Create fix branch
git checkout -b claude/fix-login-bug

# Make changes and commit
git add .
git commit -m "fix: resolve login redirect loop"

# Push (auto-creates PR)
git push -u origin claude/fix-login-bug
```

### Working with Linear Issues

```bash
# Branch name includes Linear issue ID
git checkout -b claude/CRO-456-user-profile

# The quick PR script will automatically:
# - Fetch Linear issue details
# - Use issue title in PR title
# - Include issue reference in PR body
npm run pr
```

## 🎯 VS Code UI Integration

### GitHub Pull Requests Extension

If you have the [GitHub Pull Requests](https://marketplace.visualstudio.com/items?itemName=GitHub.vscode-pull-request-github) extension installed:

1. **View PRs**: Click GitHub icon in Activity Bar
2. **Review PRs**: View PR details, comments, and changes
3. **Create PRs**: Use Command Palette → "GitHub Pull Requests: Create Pull Request"

### GitLens Extension

If you have [GitLens](https://marketplace.visualstudio.com/items?itemName=eamodio.gitlens) installed:

1. **View branch history**: Click on branch name in status bar
2. **Compare branches**: Right-click branch → "Compare with..."
3. **View commits**: GitLens sidebar shows commit history

## 🛡️ Protected Branch Prevention

### What Happens if You Try to Commit to main/development?

```bash
git checkout main
git commit -m "test"

# Output:
❌ ERROR: Direct commits to 'main' are not allowed!

Please create a new branch first:
  git checkout -b claude/CRO-XXX-description

Commit aborted.
```

### In VS Code:
1. If you try to commit on `main` or `development`
2. VS Code will show error message from pre-commit hook
3. Commit will be **blocked**
4. Create a feature branch first

## 📝 PR Template & Auto-Fill

When PRs are created, they automatically include:

```markdown
## Summary
- List of commits since branching

## Linear Issue
CRO-XXX (if branch name includes issue ID)

## Test Plan
- [x] Linting passes
- [x] Type checking passes
- [x] Tests pass
- [ ] Manual testing completed

## Changes
<!-- Describe your changes here -->

🤖 Generated with Claude Code
```

## ⚙️ Customization

### Change Default Base Branch

To temporarily use a different base branch:

```bash
npm run pr:main  # Target main branch
```

Or manually:

```bash
gh pr create --base main --web
```

### Disable Auto PR Creation

To push without auto-creating PR:

```bash
# Temporarily disable hook
git push --no-verify
```

Then manually create PR later:

```bash
npm run pr
```

## 🔧 VS Code Settings Reference

See [.vscode/settings.json](.vscode/settings.json) for all configured settings:

```json
{
  "git.defaultBranchName": "development",
  "git.branchProtection": ["main", "development"],
  "git.postCommitCommand": "none",
  "git.autofetch": true,
  "githubPullRequests.createOnPublishBranch": "ask",
  "githubPullRequests.defaultMergeMethod": "squash"
}
```

## 🐛 Troubleshooting

### PR Not Auto-Created After Push

**Check if post-push hook is installed:**
```bash
ls -la .git/hooks/post-push
```

**Reinstall hooks:**
```bash
npm run setup:hooks
```

### VS Code Not Showing GitHub Integration

**Install required extensions:**
```bash
code --install-extension GitHub.vscode-pull-request-github
code --install-extension eamodio.gitlens
```

Or use Command Palette: `Cmd+Shift+P` → "Extensions: Install Extensions"

### Wrong Base Branch in PR

**Update your branch's merge base:**
```bash
git config branch.$(git rev-parse --abbrev-ref HEAD).merge refs/heads/development
```

### Can't Push to Protected Branch

This is by design! Create a feature branch:
```bash
git checkout -b claude/feature-name
git push -u origin claude/feature-name
```

## 📚 Additional Resources

- [CLAUDE.md](../CLAUDE.md) - Full git workflow guidelines
- [BRANCH-ENFORCEMENT.md](./BRANCH-ENFORCEMENT.md) - All enforcement options
- [.githooks/README.md](../.githooks/README.md) - Git hooks documentation
- [GitHub PR Extension Docs](https://code.visualstudio.com/docs/sourcecontrol/github)

## 🎓 Quick Reference

| Action | Command | Result |
|--------|---------|--------|
| Create PR | `npm run pr` | Push + create PR to development |
| Create PR to main | `npm run pr:main` | Push + create PR to main |
| Quality checks | `Cmd+Shift+P` → Run Task → Quality Check | Lint + type + test |
| View PRs | Click GitHub icon in sidebar | Show all PRs |
| Push branch | `git push -u origin branch-name` | Auto-creates PR |
| Manual PR | `gh pr create --base development --web` | Create PR manually |

## 💡 Tips

1. **Always start from `development`**: `git checkout development && git pull`
2. **Use descriptive branch names**: `claude/CRO-XXX-description`
3. **Run quality checks before PR**: `npm run pr` does this automatically
4. **Reference Linear issues**: Include `CRO-XXX` in branch name
5. **Use VS Code tasks**: Press `Cmd+Shift+P` → "Tasks: Run Task"

## ✨ VS Code Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+Shift+G` | Open Source Control |
| `Cmd+Shift+P` | Command Palette |
| `Cmd+Shift+B` | Run Build Task (Push + Create PR) |
| `Ctrl+Shift+G G` | Focus on commit message input |

---

**Ready to create your first PR?**

```bash
git checkout -b claude/my-feature
# Make changes...
npm run pr
```

That's it! 🎉
