# Git Branch Enforcement Options

This document outlines various methods to enforce branch creation before code changes.

## Current Status

✅ **Pre-commit hook installed** at `.git/hooks/pre-commit`
- Blocks direct commits to `main` and `development`
- Provides helpful error messages with branch creation commands

## Enforcement Options (Ranked by Strictness)

### 1. Git Hooks (IMPLEMENTED ✅)

**Strictness**: Medium
**Location**: Local only (each developer/AI tool must have it)
**Bypass**: Can be bypassed with `--no-verify` flag

**What we installed:**
- Pre-commit hook blocks commits to protected branches
- Clear error messages guide to correct workflow
- Zero performance impact

**Pros:**
- Immediate feedback before commit
- Educational error messages
- Easy to maintain
- No external dependencies

**Cons:**
- Lives in `.git/hooks/` (not version controlled by default)
- Can be bypassed with `git commit --no-verify`
- Each clone needs the hook installed

**Testing:**
```bash
# Try to commit on main (should fail)
git checkout main
echo "test" >> test.txt
git add test.txt
git commit -m "test" # Will be blocked

# Create branch first (should succeed)
git checkout -b claude/test-branch
git commit -m "test" # Will work
```

### 2. GitHub Branch Protection Rules

**Strictness**: High
**Location**: Server-side (GitHub)
**Bypass**: Cannot be bypassed (except by admins)

**Setup:**
1. Go to GitHub repo → Settings → Branches
2. Add rule for `main`:
   - ✅ Require pull request before merging
   - ✅ Require approvals (1+)
   - ✅ Require status checks to pass
   - ✅ Do not allow bypassing
3. Repeat for `development`

**Pros:**
- Cannot be bypassed (strongest enforcement)
- Applies to everyone (humans and AI)
- Works with CI/CD integration
- Version controlled in GitHub

**Cons:**
- Requires GitHub repo admin access
- Only enforces at push time (not commit time)
- May require paid GitHub plan for advanced features

### 3. Git Configuration (receive.denyCurrentBranch)

**Strictness**: Low
**Location**: Local repository config
**Bypass**: Easy to modify

**Setup:**
```bash
git config branch.main.pushRemote no_push
git config branch.development.pushRemote no_push
```

**Pros:**
- Simple configuration
- Version controllable via `.git/config`

**Cons:**
- Only prevents push, not commits
- Easy to override
- Doesn't provide clear guidance

### 4. CI/CD Pre-merge Checks

**Strictness**: Medium-High
**Location**: CI/CD pipeline
**Bypass**: Only by admins

**Setup:** Add to `.github/workflows/branch-check.yml`:
```yaml
name: Branch Check
on: [pull_request]
jobs:
  check-branch:
    runs-on: ubuntu-latest
    steps:
      - name: Verify source branch naming
        run: |
          if [[ ! "${{ github.head_ref }}" =~ ^(claude|codex|feature|fix|hotfix)/ ]]; then
            echo "Branch must follow naming convention"
            exit 1
          fi
```

**Pros:**
- Enforced in PR workflow
- Can be combined with other checks
- Provides audit trail

**Cons:**
- Only runs on PR creation
- Doesn't prevent local commits
- Requires CI/CD setup

### 5. Git Template Directory (RECOMMENDED FOR TEAMS)

**Strictness**: Medium
**Location**: Global template applied to all clones
**Bypass**: Can be bypassed with `--no-verify`

**Setup:**
```bash
# One-time setup
mkdir -p ~/.git-templates/hooks
cp .git/hooks/pre-commit ~/.git-templates/hooks/
chmod +x ~/.git-templates/hooks/pre-commit
git config --global init.templateDir ~/.git-templates

# Now all new clones automatically get the hook
git clone <repo>  # Hook is auto-installed
```

**Pros:**
- Automatically applied to all new clones
- Team-wide consistency
- One-time setup per developer

**Cons:**
- Doesn't affect existing clones
- Still can be bypassed with `--no-verify`

### 6. Server-Side Hooks (Git Server)

**Strictness**: Highest
**Location**: Git server (if self-hosted)
**Bypass**: Cannot be bypassed

**Setup:** (Requires server access)
```bash
# On git server: /path/to/repo.git/hooks/update
# Rejects pushes to protected branches
```

**Pros:**
- Strongest enforcement (server-side)
- Cannot be bypassed
- Centralized management

**Cons:**
- Only for self-hosted Git
- Not available on GitHub/GitLab without special access
- Requires server administration

## Recommended Configuration

### For Solo Developer + AI Tools:
1. ✅ **Git Hooks** (implemented above)
2. ✅ **GitHub Branch Protection** (highly recommended)

### For Team Development:
1. ✅ **Git Template Directory** (auto-install hooks)
2. ✅ **GitHub Branch Protection** (strong enforcement)
3. ✅ **CI/CD Checks** (extra validation layer)

## Implementation Checklist

- [x] Pre-commit hook installed
- [ ] GitHub branch protection rules configured
- [ ] Git template directory set up (for team)
- [ ] CI/CD branch checks added (optional)
- [ ] Team members notified of workflow

## Testing Your Enforcement

```bash
# Test 1: Try to commit on main (should fail)
git checkout main
echo "test" > test-file.txt
git add test-file.txt
git commit -m "test"
# Expected: ❌ ERROR: Direct commits to 'main' are not allowed!

# Test 2: Create branch first (should succeed)
git checkout -b claude/test-enforcement
git commit -m "test"
# Expected: ✅ Commit successful

# Cleanup
git checkout main
git branch -D claude/test-enforcement
rm test-file.txt
```

## Bypassing for Emergencies

If you absolutely must commit to a protected branch (emergency hotfix):

```bash
# Bypass pre-commit hook (use with extreme caution)
git commit --no-verify -m "Emergency hotfix"
```

**Note**: GitHub branch protection cannot be bypassed (except by admins), which is why it's recommended as the primary enforcement mechanism.

## Monitoring Compliance

Track branch creation patterns:
```bash
# See recent branches created
git for-each-ref --sort=-committerdate refs/heads/ --format='%(refname:short) %(committerdate:relative)'

# Check for direct commits to main
git log main --oneline --since="1 week ago"

# Verify all commits came through PRs
gh pr list --state merged --limit 20
```

## Troubleshooting

**Hook not running?**
```bash
# Check if hook exists and is executable
ls -la .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

**Hook still allows commits?**
```bash
# Verify you're on a protected branch
git branch --show-current

# Check hook content
cat .git/hooks/pre-commit
```

**Need to share hooks with team?**
```bash
# Option 1: Version control hooks (recommended)
mkdir -p .githooks
cp .git/hooks/pre-commit .githooks/
git add .githooks/
git commit -m "Add pre-commit hook for branch protection"

# Team members run:
cp .githooks/pre-commit .git/hooks/
chmod +x .git/hooks/pre-commit

# Option 2: Use Husky (Node.js projects)
npm install --save-dev husky
npx husky install
npx husky add .husky/pre-commit "$(cat .git/hooks/pre-commit)"
```

## Next Steps

1. **Immediate**: The pre-commit hook is now active and will block direct commits to `main` and `development`
2. **Recommended**: Set up GitHub branch protection rules (requires repo admin)
3. **Optional**: Consider setting up git template directory for team-wide automatic hook installation

## Resources

- [Git Hooks Documentation](https://git-scm.com/docs/githooks)
- [GitHub Branch Protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches)
- [Husky for Git Hooks](https://typicode.github.io/husky/)
