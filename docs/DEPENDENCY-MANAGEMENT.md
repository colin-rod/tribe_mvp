# Dependency Management Guide

## Overview

This document outlines the processes and best practices for managing dependencies in the Tribe MVP project. We use a combination of automated tools and manual processes to keep dependencies secure, up-to-date, and stable.

## Table of Contents

1. [Automated Tools](#automated-tools)
2. [Dependency Update Process](#dependency-update-process)
3. [Security Auditing](#security-auditing)
4. [Version Pinning Strategy](#version-pinning-strategy)
5. [Testing After Updates](#testing-after-updates)
6. [Emergency Security Updates](#emergency-security-updates)
7. [Troubleshooting](#troubleshooting)

---

## Automated Tools

### Dependabot

We use GitHub Dependabot for automated dependency updates.

**Configuration**: [`.github/dependabot.yml`](../.github/dependabot.yml)

**Features**:
- Weekly automated PR creation for dependency updates
- Grouped updates to reduce PR noise
- Separate handling for patch, minor, and major updates
- Automatic security vulnerability detection

**PR Labels**:
- `dependencies` - All dependency updates
- `automated` - Automated PRs from Dependabot

### CI/CD Security Scanning

Our CI pipeline includes automated security audits on every push and PR.

**Configuration**: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)

**What it checks**:
- `npm audit --audit-level=moderate` - Security vulnerabilities
- All linting, type checking, and tests must pass
- Build must succeed

---

## Dependency Update Process

### Regular Updates (Weekly)

Dependabot automatically creates PRs every Monday at 9:00 AM EST.

#### Handling Dependabot PRs

1. **Review the PR**
   - Check the changelog/release notes
   - Review breaking changes
   - Check for security fixes

2. **Local Testing** (for non-patch updates)
   ```bash
   # Check out the PR branch
   gh pr checkout <PR_NUMBER>

   # Install dependencies
   npm install

   # Run full test suite
   npm run lint
   npm run type-check
   npm test
   npm run build

   # Test locally
   npm run dev
   ```

3. **Approve and Merge**
   - If tests pass and app works correctly, approve and merge
   - Delete the branch after merging

### Manual Updates

For dependencies that require careful migration or major version updates:

#### 1. Check for Updates

```bash
# Check which packages have updates available
npm outdated

# See detailed information about a specific package
npm info <package-name>
```

#### 2. Update Incrementally

**Patch updates** (1.2.3 → 1.2.4):
```bash
npm update <package-name>
```

**Minor updates** (1.2.3 → 1.3.0):
```bash
npm install <package-name>@latest
```

**Major updates** (1.2.3 → 2.0.0):
```bash
# Check for breaking changes first!
npm install <package-name>@latest

# If issues, rollback
npm install <package-name>@<previous-version>
```

#### 3. Update package.json Directly

For specific version control:

```json
{
  "dependencies": {
    "next": "15.5.4",  // Exact version
    "react": "^19.2.0"  // Allow minor updates
  }
}
```

Then run:
```bash
npm install
```

---

## Security Auditing

### Running Security Audits

#### Check for Vulnerabilities

```bash
# Full audit report
npm audit

# Only moderate and above
npm audit --audit-level=moderate

# Production dependencies only
npm audit --production
```

#### Understanding Audit Output

- **Critical**: Fix immediately
- **High**: Fix within 1 week
- **Moderate**: Fix within 1 month
- **Low**: Fix when convenient

#### Fixing Vulnerabilities

```bash
# Automatic fix (patch and minor updates)
npm audit fix

# Include breaking changes (use with caution!)
npm audit fix --force
```

⚠️ **Warning**: `npm audit fix --force` can introduce breaking changes. Always test thoroughly.

### CI Security Checks

Every PR and push triggers security audits:

```yaml
- name: Security audit
  run: npm audit --audit-level=moderate
```

If vulnerabilities are found, the CI build fails.

---

## Version Pinning Strategy

### When to Pin Exact Versions

Pin exact versions (no `^` or `~`) for:

✅ **Production-critical packages**:
- `next` - Framework stability
- `react` & `react-dom` - React version consistency
- Database clients (`@supabase/supabase-js`)

Example:
```json
{
  "dependencies": {
    "next": "15.5.4",
    "react": "19.2.0"
  }
}
```

### When to Allow Auto-Updates

Use caret (`^`) for:

✅ **Well-maintained libraries**:
- UI libraries (`lucide-react`)
- Utilities (`clsx`, `date-fns`)
- Build tools (devDependencies)

Example:
```json
{
  "dependencies": {
    "date-fns": "^4.1.0",
    "clsx": "^2.1.1"
  }
}
```

### Major Version Strategy

**Blocked in Dependabot** for:
- `next`, `react`, `typescript`, `tailwindcss`, `jest`
- Requires manual migration and testing

**Why**: Major versions often include breaking changes requiring code updates.

---

## Testing After Updates

### Pre-Merge Checklist

Before merging any dependency update PR:

- [ ] CI passes (lint, types, tests, build)
- [ ] Security audit shows no new vulnerabilities
- [ ] Local dev server starts successfully
- [ ] Critical user flows work (auth, creating updates, etc.)
- [ ] Production build completes
- [ ] No console errors or warnings

### Testing Commands

```bash
# 1. Linting
npm run lint

# 2. Type checking
npm run type-check

# 3. Unit tests
npm test

# 4. Accessibility tests
npm run test:a11y

# 5. Build
npm run build

# 6. Local testing
npm run dev
```

### Critical Test Areas

After updating dependencies, manually test:

1. **Authentication**
   - Sign up, login, logout
   - Password reset flow

2. **Core Features**
   - Create an update
   - Upload media
   - Send to recipients
   - View timeline

3. **Database Operations**
   - CRUD operations work
   - Real-time subscriptions work (if applicable)

4. **UI/UX**
   - No visual regressions
   - Responsive design intact
   - Accessibility features work

---

## Emergency Security Updates

### When a Critical Vulnerability is Discovered

1. **Assess Impact**
   ```bash
   npm audit
   ```
   - Is it in production dependencies?
   - Is the vulnerable code path used?

2. **Immediate Action**
   ```bash
   # Update the vulnerable package
   npm update <vulnerable-package>

   # Or install specific version
   npm install <package>@<safe-version>
   ```

3. **Fast-Track Testing**
   ```bash
   # Quick validation
   npm run lint && npm run type-check && npm test
   ```

4. **Deploy ASAP**
   - Create PR with `[SECURITY]` prefix
   - Request immediate review
   - Deploy to production after tests pass

5. **Post-Deploy Monitoring**
   - Monitor error logs
   - Check production metrics
   - Verify fix resolves vulnerability

---

## Troubleshooting

### Common Issues

#### Issue: `npm install` Fails After Update

**Solution**:
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

#### Issue: Type Errors After Update

**Solution**:
```bash
# Update TypeScript type definitions
npm install --save-dev @types/node@latest @types/react@latest

# Check for type definition changes in package
npm info <package-name>
```

#### Issue: Breaking Changes in Update

**Solution**:
```bash
# Rollback to previous version
npm install <package-name>@<previous-version>

# Update package.json to pin that version
# Then gradually migrate to new version
```

#### Issue: Peer Dependency Conflicts

**Solution**:
```bash
# See dependency tree
npm list <package-name>

# Use --legacy-peer-deps if needed (temporary)
npm install --legacy-peer-deps

# Better: Update conflicting peer dependencies
npm install <peer-dependency>@<compatible-version>
```

#### Issue: Dependency Audit Fails in CI

**Solution**:
1. Run audit locally: `npm audit`
2. Fix vulnerabilities: `npm audit fix`
3. If no fix available, document exception
4. Update CI to ignore specific advisories (temporary):
   ```yaml
   npm audit --audit-level=moderate --omit=dev
   ```

### Getting Help

If you encounter issues:

1. **Check the package changelog**: Look for migration guides
2. **Search GitHub Issues**: Others may have encountered the same problem
3. **Consult the team**: Ask in Slack/Teams before rolling back
4. **Document the issue**: Create a Linear ticket with details

---

## Best Practices

### DO ✅

- **Review changelogs** before updating
- **Test thoroughly** after updates
- **Update regularly** to avoid large jumps
- **Keep package-lock.json** in version control
- **Document breaking changes** in PR descriptions
- **Group related updates** (e.g., all Storybook packages)
- **Pin critical dependencies** for stability

### DON'T ❌

- **Don't run `npm audit fix --force`** without testing
- **Don't update everything at once** - do incrementally
- **Don't ignore CI failures** - investigate and fix
- **Don't skip security updates** - prioritize them
- **Don't commit `node_modules`** to version control
- **Don't use `npm install`** without `package-lock.json` in CI

---

## Monitoring and Reporting

### Weekly Dependency Review

Every Monday:
1. Review Dependabot PRs
2. Check for security advisories
3. Update critical packages if needed
4. Document any issues in Linear

### Monthly Audit

First Monday of each month:
1. Run full `npm outdated` check
2. Review major version updates blocked by Dependabot
3. Plan migrations for major updates
4. Update this documentation if processes change

---

## Resources

### Tools

- [npm-check-updates](https://www.npmjs.com/package/npm-check-updates) - Check for updates
- [npm audit](https://docs.npmjs.com/cli/v8/commands/npm-audit) - Security audits
- [Dependabot](https://github.com/dependabot) - Automated updates
- [Snyk](https://snyk.io/) - Alternative security scanning (if needed)

### Documentation

- [npm Documentation](https://docs.npmjs.com/)
- [Semantic Versioning](https://semver.org/)
- [GitHub Dependabot](https://docs.github.com/en/code-security/dependabot)
- [Next.js Upgrade Guide](https://nextjs.org/docs/upgrading)

### Internal Links

- [CI/CD Pipeline](../.github/workflows/ci.yml)
- [Dependabot Config](../.github/dependabot.yml)
- [package.json](../package.json)

---

## Changelog

### 2025-10-02
- Initial documentation created
- Added Dependabot configuration
- Added security audit to CI pipeline
- Updated all dependencies to latest stable versions
- Fixed critical Next.js and @supabase/ssr vulnerabilities

---

## Questions?

If you have questions about dependency management:
1. Check this documentation first
2. Search the repository for similar issues
3. Ask in the team channel
4. Create a Linear ticket with the `infrastructure` label
