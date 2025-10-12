# Repository Setup Guide

## Quick Start for New Team Members

After cloning this repository, run:

```bash
npm install
npm run setup:hooks
```

This will:
1. Install Node.js dependencies
2. Install git hooks for branch protection

## Git Hooks

This repository uses git hooks to enforce the branch workflow described in [CLAUDE.md](../CLAUDE.md).

**What's enforced:**
- No direct commits to `main` or `development` branches
- All changes must go through Pull Requests
- Feature branches must be created first

**Installation:**
```bash
npm run setup:hooks
# or
./.githooks/install.sh
```

**Testing:**
```bash
# This should fail (if on main/development)
git checkout main
git commit -m "test"  # ❌ Blocked

# This should work (on feature branch)
git checkout -b claude/test
git commit -m "test"  # ✅ Allowed
```

See [.githooks/README.md](../.githooks/README.md) for more details.

## Development Workflow

See [CLAUDE.md](../CLAUDE.md) for:
- Git workflow and branch strategy
- Pull Request requirements
- Code quality standards
- Linear integration
- Database migration guidelines

## Branch Enforcement

See [BRANCH-ENFORCEMENT.md](./BRANCH-ENFORCEMENT.md) for:
- All enforcement options (hooks, GitHub rules, CI/CD)
- Testing procedures
- Troubleshooting
- Team setup recommendations
