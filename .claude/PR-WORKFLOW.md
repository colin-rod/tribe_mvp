# Claude Code Pull Request Workflow

## Overview

This document describes the Pull Request workflow for Claude Code in the Tribe MVP repository. This workflow ensures all AI-generated code goes through proper review before merging.

## Why This Workflow?

### Benefits
- ✅ **Human Review Required**: All changes must be reviewed and approved
- ✅ **Quality Gates**: Automated CI/CD runs on every PR
- ✅ **Multi-Agent Safety**: Prevents conflicts between Claude, Copilot, Cursor, and human developers
- ✅ **Clean Git History**: Clear separation between AI and human commits
- ✅ **Traceability**: `claude/` prefix clearly identifies AI-generated changes
- ✅ **Linear Integration**: Automatic linking to Linear issues

## Setup Complete ✓

The following components have been installed and configured:

### 1. GitHub CLI ✓
- Installed via Homebrew
- Location: `/opt/homebrew/bin/gh`
- Version: 2.81.0

### 2. Documentation ✓
- [CLAUDE.md](../CLAUDE.md) - Updated with Git Workflow section
- Includes branch naming conventions
- Includes PR requirements and checklist

### 3. Helper Script ✓
- [.claude/scripts/create-pr.sh](.claude/scripts/create-pr.sh)
- Automated PR creation workflow
- Includes quality checks
- Handles Linear issue integration

### 4. GitHub Action ✓
- [.github/workflows/claude-pr.yml](../.github/workflows/claude-pr.yml)
- Runs automatically on `claude/*` branches
- Posts quality check results as PR comments
- Auto-creates PR if one doesn't exist
- Adds labels: `claude-generated`, `needs-review`

### 5. Permissions ✓
- [.claude/settings.local.json](.claude/settings.local.json)
- Added GitHub CLI permissions
- Added git branch permissions
- Added script execution permissions

## Next Steps (Action Required)

### Step 1: Authenticate GitHub CLI

Run the following command:

```bash
gh auth login
```

Follow the prompts:
1. Select **GitHub.com**
2. Choose **HTTPS** (recommended) or SSH
3. Authenticate via **web browser** (recommended)
4. Authorize the GitHub CLI application

Verify authentication:
```bash
gh auth status
```

### Step 2: Test the Workflow

Once authenticated, you have two options to create PRs:

#### Option A: Using the Helper Script (Recommended)

```bash
# For Linear issue work
./.claude/scripts/create-pr.sh CRO-XXX "short-description"

# For bug fixes
./.claude/scripts/create-pr.sh fix "description"

# For features
./.claude/scripts/create-pr.sh feature "description"
```

The script will:
1. ✅ Create a new branch
2. ✅ Run quality checks (lint, type-check, tests)
3. ✅ Commit changes
4. ✅ Push to remote
5. ✅ Open a Pull Request

#### Option B: Manual Workflow

```bash
# 1. Create and checkout new branch
git checkout -b claude/CRO-XXX-description

# 2. Run quality checks
npm run lint
npx tsc --noEmit
npm test

# 3. Stage and commit changes
git add .
git commit -m "feat: description

Refs: CRO-XXX"

# 4. Push to remote
git push -u origin claude/CRO-XXX-description

# 5. Create PR
gh pr create \
  --title "feat: description" \
  --body "## Summary
- Changes

## Linear Issue
CRO-XXX

## Test Plan
- Quality checks passed

🤖 Generated with Claude Code" \
  --base development
```

## Branch Naming Convention

Use the `claude/` prefix with descriptive names:

| Type | Format | Example |
|------|--------|---------|
| Linear Issue | `claude/CRO-XXX-description` | `claude/CRO-293-add-memory-metadata` |
| Bug Fix | `claude/fix-description` | `claude/fix-auth-redirect-loop` |
| Feature | `claude/feature-description` | `claude/feature-profile-settings` |
| Refactor | `claude/refactor-description` | `claude/refactor-api-handlers` |

## PR Requirements Checklist

Before creating a PR, ensure:

- [ ] All changes are committed
- [ ] `npm run lint` passes with no errors
- [ ] `npx tsc --noEmit` passes with no errors
- [ ] `npm test` passes with all tests green
- [ ] Linear issue ID is referenced (if applicable)
- [ ] Descriptive commit messages following conventional commits
- [ ] Base branch is `development` (or `main` for hotfixes)

## Automated Quality Checks

When you push a `claude/*` branch, the GitHub Action will automatically:

1. **Run Quality Checks**:
   - Linting
   - Type checking
   - Unit tests
   - Color contrast (WCAG AA)
   - Accessibility tests
   - Build verification

2. **Post Results**:
   - Comments on PR with quality report
   - Shows pass/fail status for each check

3. **Add Labels**:
   - `claude-generated` - Identifies AI-generated code
   - `needs-review` - Requires human review
   - `failing-checks` - If quality checks fail

4. **Auto-create PR** (if you forget):
   - Detects `claude/*` branches without PRs
   - Automatically creates PR with standard template
   - Links to Linear issues when detected

## Current State

Your repository currently has the following pending changes:

### Modified Files
- `CLAUDE.md` - Git Workflow documentation
- `src/components/drafts/DraftEditor.tsx`
- `src/components/preferences/PreferenceForm.tsx`
- `src/components/profile/SummarySettings.tsx`
- `src/components/ui/index.ts`
- `src/components/updates/MemoryForm.tsx`
- `src/lib/memories.ts`
- `src/lib/types/memory.ts`
- `src/lib/validation/update.ts`

### New Files
- `.claude/` - Claude Code configuration and scripts
- `.github/workflows/claude-pr.yml` - GitHub Action
- `docs/` - Implementation documentation
- `src/app/api/memories/` - Memory API endpoints
- `src/app/api/metadata/` - Metadata API endpoints
- `src/components/metadata/` - Metadata components
- `src/components/ui/IconOptionSelector.*` - New component
- `src/lib/api/metadata.ts` - Metadata API client
- `supabase/migrations/20251011000001_memory_metadata.sql` - Database migration

## Test the Workflow Now

Once you've authenticated with `gh auth login`, test the workflow:

```bash
# Example: Create PR for current changes
./.claude/scripts/create-pr.sh CRO-293 "pr-workflow-implementation"
```

This will create a PR with all the current changes, demonstrating the complete workflow.

## Workflow Diagram

```
┌─────────────────────┐
│  Claude makes       │
│  code changes       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Create claude/*    │
│  feature branch     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Run quality checks │
│  (lint, test, etc)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Commit & push      │
│  to remote          │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Create Pull        │
│  Request            │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  GitHub Action runs │
│  - Quality checks   │
│  - Post results     │
│  - Add labels       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Human reviews PR   │
│  - Check changes    │
│  - Review quality   │
│  - Approve/Request  │
│    changes          │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Merge to           │
│  development/main   │
└─────────────────────┘
```

## Troubleshooting

### GitHub CLI Not Authenticated
```bash
# Check status
gh auth status

# Login
gh auth login

# Refresh token
gh auth refresh
```

### Permission Denied on Script
```bash
chmod +x ./.claude/scripts/create-pr.sh
```

### Quality Checks Failing
```bash
# Run checks manually
npm run lint
npx tsc --noEmit
npm test

# Fix issues before creating PR
```

### PR Already Exists
```bash
# List existing PRs for current branch
gh pr list --head $(git branch --show-current)

# View existing PR
gh pr view
```

## Additional Resources

- [GitHub CLI Documentation](https://cli.github.com/manual/)
- [Linear CLI Documentation](https://github.com/linearapp/linear/tree/master/packages/cli)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [CLAUDE.md](../CLAUDE.md) - Full project documentation

## Support

If you encounter issues:
1. Check [CLAUDE.md](../CLAUDE.md) for detailed guidelines
2. Verify GitHub CLI authentication: `gh auth status`
3. Ensure all quality checks pass before creating PR
4. Review GitHub Action logs in the Actions tab

---

**Last Updated**: 2025-10-11
**Status**: ✅ Ready for use (pending GitHub CLI authentication)
