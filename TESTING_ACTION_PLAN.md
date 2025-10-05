# Testing Action Plan - Immediate Next Steps

**Project:** Tribe MVP
**Current Coverage:** 93.92% (limited scope) → **Real Coverage: ~5%**
**Target Coverage:** 90% comprehensive coverage

---

## 🚨 Critical Findings

### The Coverage Illusion
Your jest.config.js is only tracking a tiny subset of the codebase:
- **13 files** being tracked for coverage
- **385+ files** completely ignored
- **26 API endpoints** with ZERO tests
- **Critical security middleware** minimally tested

### Immediate Risk
- Production bugs likely in untested code paths
- Security vulnerabilities in auth and API routes
- Business logic failures possible
- No safety net for refactoring

---

## ✅ Week 1 Action Items

### Day 1-2: Fix Coverage Configuration

**1. Update jest.config.js**

Current (Limited):
```javascript
collectCoverageFrom: [
  'src/components/responses/**/*.{ts,tsx}',
  'src/components/media/**/*.{ts,tsx}',
  'src/hooks/useResponses*.{ts,tsx}',
]
```

Replace with (Comprehensive):
```javascript
collectCoverageFrom: [
  'src/**/*.{ts,tsx}',
  '!src/**/*.d.ts',
  '!src/**/*.stories.{ts,tsx}',
  '!src/**/__tests__/**',
  '!src/app/**/layout.tsx',
  '!src/app/**/page.tsx',
  '!src/app/**/loading.tsx',
  '!src/app/**/error.tsx',
]
```

**2. Run Full Coverage Report**

```bash
npm test -- --coverage --coverageReporters=html --coverageReporters=text
```

Expected outcome: You'll see real coverage drop to ~5-10%

### Day 3-4: Add Critical API Tests

**Priority 1: Groups API** (2-3 hours)
```bash
# Create test file
touch src/__tests__/api/groups.integration.test.ts
```

Copy template from `TEST_TEMPLATES.md` → "Template 1: API Route Integration Test"

**Tests to write:**
- [ ] GET /api/groups - requires auth
- [ ] GET /api/groups - returns user groups
- [ ] POST /api/groups - creates group
- [ ] POST /api/groups - enforces 25 limit
- [ ] POST /api/groups - prevents duplicates
- [ ] POST /api/groups - invalidates cache

**Priority 2: Invitations API** (3-4 hours)
```bash
touch src/__tests__/api/invitations.integration.test.ts
```

**Tests to write:**
- [ ] POST /api/invitations - single-use creation
- [ ] POST /api/invitations - reusable link creation
- [ ] GET /api/invitations - list with filters
- [ ] POST /api/invitations/redeem - redemption flow
- [ ] GET /api/invitations/validate - token validation

### Day 5: Authentication Security

**Priority 3: Auth Flow Tests** (2-3 hours)
```bash
touch src/__tests__/auth/authentication.test.ts
```

Use "Template 4: Authentication Flow Test" from `TEST_TEMPLATES.md`

**Tests to write:**
- [ ] Login with valid credentials
- [ ] Login with invalid credentials
- [ ] Email validation
- [ ] Password strength validation
- [ ] Error message display
- [ ] Redirect after login
- [ ] Signup flow
- [ ] Password reset

---

## 📊 Week 2 Action Items

### Day 6-8: Service Layer Coverage

**Priority 4: Invitation Service** (4-5 hours)
```bash
touch src/__tests__/services/invitationService.test.ts
```

Use "Template 2: Service Layer Test"

**Coverage targets:**
- [ ] createSingleUseInvitation()
- [ ] createReusableLink()
- [ ] validateInvitation()
- [ ] redeemInvitation()
- [ ] getUserInvitations()
- [ ] Token generation security
- [ ] Expiration logic

**Priority 5: Email Services** (4-5 hours)
```bash
touch src/__tests__/services/emailDistribution.test.ts
touch src/__tests__/services/emailQueue.test.ts
```

**Coverage targets:**
- [ ] Email queue management
- [ ] Bulk sending logic
- [ ] Rate limiting
- [ ] Template rendering
- [ ] Delivery tracking
- [ ] Retry logic

### Day 9-10: Group Management

**Priority 6: Group Service Tests** (3-4 hours)
```bash
touch src/__tests__/lib/group-management.test.ts
```

**Coverage targets:**
- [ ] getRecipientGroups() - token validation
- [ ] updateRecipientGroupSettings()
- [ ] getGroupWithMembers()
- [ ] addRecipientsToGroup()
- [ ] removeRecipientFromGroup()
- [ ] updateGroupNotificationSettings()
- [ ] getGroupAnalytics()
- [ ] Authorization checks

---

## 🔧 Week 3 Action Items

### Day 11-13: Custom Hooks

**Priority 7: Critical Hooks** (6-8 hours)

Create tests for high-impact hooks:
```bash
touch src/hooks/__tests__/useEmailDistribution.test.ts
touch src/hooks/__tests__/useNotificationManager.test.ts
touch src/hooks/__tests__/useProfileManager.test.ts
touch src/hooks/__tests__/useUpdateCreation.test.ts
```

Use "Template 3: Hook Test" from `TEST_TEMPLATES.md`

### Day 14-15: Validation & Security

**Priority 8: Validation Schemas** (3-4 hours)
```bash
touch src/__tests__/validation/schemas.test.ts
```

**Priority 9: Security Middleware** (3-4 hours)
```bash
touch src/__tests__/middleware/security.test.ts
```

Use "Template 5: Middleware Security Test"

**Coverage targets:**
- [ ] CSRF token validation
- [ ] XSS sanitization
- [ ] Request sanitization
- [ ] Security headers
- [ ] Rate limiting enforcement

---

## 📈 Success Metrics

### After Week 1
- ✅ Real coverage visible (likely 15-20%)
- ✅ Critical API routes tested (Groups, Invitations)
- ✅ Auth flow secured with tests
- ✅ Foundation for TDD established

### After Week 2
- ✅ Service layer coverage > 70%
- ✅ Business logic protected
- ✅ Email system tested
- ✅ Group management covered

### After Week 3
- ✅ Hook coverage > 80%
- ✅ Security middleware tested
- ✅ Validation schemas covered
- ✅ Overall coverage > 60%

### After 4 Weeks
- ✅ Overall coverage > 90%
- ✅ All critical paths tested
- ✅ E2E tests for user journeys
- ✅ CI/CD with quality gates

---

## 🛠️ Testing Workflow

### Daily Routine

**1. Before Writing Code:**
```bash
# Create test file first (TDD)
touch src/__tests__/[feature].test.ts

# Write failing tests
npm test -- --watch [feature].test.ts
```

**2. Write Implementation:**
```bash
# Implement feature to make tests pass
# Refactor with confidence
```

**3. Verify Coverage:**
```bash
# Check coverage for your changes
npm test -- --coverage --collectCoverageFrom='src/path/to/feature/**'
```

**4. Before Committing:**
```bash
# Run all tests
npm test

# Check types
npx tsc --noEmit

# Lint code
npm run lint
```

### Code Review Checklist

- [ ] New code has tests
- [ ] Tests cover happy path
- [ ] Tests cover error cases
- [ ] Coverage not decreased
- [ ] All tests passing
- [ ] No console errors/warnings

---

## 🎯 Quick Wins (Do These First)

### 1. Fix Coverage Config (15 minutes)
```bash
# Edit jest.config.js
# Update collectCoverageFrom array
# Run: npm test -- --coverage
```

### 2. Add Groups API Tests (2 hours)
```bash
# Copy template from TEST_TEMPLATES.md
# Adapt to your API route
# Add 6-8 test cases
```

### 3. Add Auth Tests (2 hours)
```bash
# Test login flow
# Test validation
# Test error handling
```

### 4. Add Service Tests (3 hours)
```bash
# Pick highest-risk service
# Test core functions
# Mock dependencies
```

**Total Time to 30% Coverage: ~8 hours of focused work**

---

## 📚 Resources Created

### 1. TEST_COVERAGE_REPORT.md
- Comprehensive analysis
- Gap identification
- Top 10 priorities
- Test type recommendations

### 2. TEST_TEMPLATES.md
- 5 ready-to-use templates
- API integration tests
- Service layer tests
- Hook tests
- Auth flow tests
- Security middleware tests

### 3. This Document (TESTING_ACTION_PLAN.md)
- Week-by-week roadmap
- Specific action items
- Success metrics
- Daily workflow

---

## 🚀 Get Started Right Now

**Step 1: Fix Coverage (5 minutes)**
```bash
# Edit jest.config.js and update collectCoverageFrom
```

**Step 2: See Real Coverage (2 minutes)**
```bash
npm test -- --coverage
# Note the actual low percentage
```

**Step 3: Pick Template (2 minutes)**
```bash
# Open TEST_TEMPLATES.md
# Copy "Template 1: API Route Integration Test"
```

**Step 4: Write First Test (30 minutes)**
```bash
# Create src/__tests__/api/groups.integration.test.ts
# Paste template
# Adapt to your code
# Run: npm test groups.integration.test.ts
```

**Step 5: Celebrate! 🎉**
```bash
# You've started fixing the coverage gap!
# Commit your first test
# Repeat with next template
```

---

## ⚠️ Common Pitfalls to Avoid

### Don't:
- ❌ Write tests just to increase coverage %
- ❌ Skip edge cases and error handling
- ❌ Over-mock (makes tests brittle)
- ❌ Test implementation details
- ❌ Write flaky tests that intermittently fail

### Do:
- ✅ Test behavior, not implementation
- ✅ Write clear, readable test names
- ✅ Focus on critical business logic first
- ✅ Keep tests fast (< 100ms per test)
- ✅ Use descriptive assertions

---

## 🏆 Definition of Done

A feature is "done" when:
1. ✅ All acceptance criteria met
2. ✅ Unit tests written and passing
3. ✅ Integration tests for APIs
4. ✅ Coverage ≥ 80% for new code
5. ✅ No regression in existing tests
6. ✅ Code reviewed and approved
7. ✅ Types validated (tsc --noEmit)
8. ✅ Linting passed (npm run lint)
9. ✅ Documentation updated
10. ✅ Deployed to staging and verified

---

## 📞 Support & Questions

### Stuck on Testing?
1. Check TEST_TEMPLATES.md for examples
2. Review existing tests in `src/__tests__/`
3. Consult Jest docs: https://jestjs.io
4. React Testing Library: https://testing-library.com

### Need Help with Specific Area?
- **API Tests:** See Template 1 + authorization.integration.test.ts
- **Hooks:** See Template 3 + useResponses.test.ts
- **Components:** See existing Response*.test.tsx files
- **Services:** See Template 2 (new)

---

## 🎯 Target: 90% Coverage in 4 Weeks

**Week 1:** 20% → Critical APIs & Auth
**Week 2:** 45% → Services & Business Logic
**Week 3:** 70% → Hooks & Validation
**Week 4:** 90% → UI Components & E2E

**Start now. Test first. Ship with confidence.**

---

**Last Updated:** 2025-10-05
**Next Review:** After Week 1 completion
