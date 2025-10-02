# Visual Regression Testing - Quick Setup

## ⚡ Quick Start (5 minutes)

### 1. Install Playwright Browsers
```bash
npx playwright install
```

### 2. Generate Baseline Screenshots
```bash
npm run test:visual:update
```

This will:
- Start Storybook on port 6006
- Navigate to all component stories
- Capture baseline screenshots
- Save them in `tests/visual/` directory

### 3. Run Visual Tests
```bash
npm run test:visual
```

### 4. View Test Report
```bash
npm run test:visual:report
```

## 📋 Next Steps

After generating baselines, you should:

1. **Review the screenshots** in `tests/visual/` to ensure they look correct
2. **Commit them to git**:
   ```bash
   git add tests/visual/
   git commit -m "CRO-161: Add baseline screenshots for visual regression tests"
   ```

3. **Make changes to a component** and see visual tests in action:
   ```bash
   # Edit a component
   # Run tests
   npm run test:visual

   # If intentional, update baselines
   npm run test:visual:update
   ```

## 📚 Available Commands

| Command | Description |
|---------|-------------|
| `npm run test:visual` | Run all visual tests |
| `npm run test:visual:ui` | Run tests with interactive UI |
| `npm run test:visual:update` | Update baseline screenshots |
| `npm run test:visual:debug` | Debug tests step-by-step |
| `npm run test:visual:report` | View HTML test report |

## 🎯 What Gets Tested

Visual regression tests cover:

- ✅ **Button**: All 9 variants + loading/disabled states
- ✅ **Alert**: 5 variants + dismissible + custom icons
- ✅ **Badge**: All variants
- ✅ **Card**: Basic, with header, with footer
- ✅ **Input**: Default, with label, disabled, error states
- ✅ **Textarea**: Default, with label, disabled
- ✅ **LoadingSpinner**: All sizes
- ✅ **ChildCard**: All variants
- ✅ **UpdateCard**: All variants

## 🔄 Typical Workflow

### When Making Component Changes

1. **Make your changes** to a component
2. **Run visual tests**: `npm run test:visual`
3. **Review the report**: `npm run test:visual:report`
4. **Decide**:
   - ❌ Bug/unintended change? → Fix the component
   - ✅ Intentional change? → Update baselines: `npm run test:visual:update`
5. **Commit**: `git add tests/visual/ && git commit -m "Update visual baselines"`

### When Adding New Components

1. **Create Storybook stories** for all component variants
2. **Add test file** in `tests/visual/`
3. **Generate baselines**: `npm run test:visual:update`
4. **Verify**: `npm run test:visual`
5. **Commit**: Include both stories and baselines

## 🚀 CI/CD Integration

Visual tests run automatically on:
- ✅ Every push to `main` or `development`
- ✅ Every pull request

If tests fail in CI:
1. Go to **Actions** tab on GitHub
2. Download **playwright-report** artifact
3. Extract and open `index.html`
4. Review visual differences
5. Fix or update baselines locally

## 📖 Full Documentation

For complete documentation, see:
- [docs/VISUAL_REGRESSION_TESTING.md](docs/VISUAL_REGRESSION_TESTING.md) - Complete guide
- [docs/CRO-161-IMPLEMENTATION-SUMMARY.md](docs/CRO-161-IMPLEMENTATION-SUMMARY.md) - Implementation details
- [tests/visual/README.md](tests/visual/README.md) - Test directory docs

## ❓ Troubleshooting

### Tests fail locally but baselines look correct
Run `npm run test:visual:update` to regenerate baselines

### Storybook won't start
```bash
# Test Storybook manually
npm run storybook
# Visit http://localhost:6006
```

### Can't find screenshots
Screenshots are in:
- Baselines: `tests/visual/**/*.png`
- Test results: `test-results/`
- Reports: `playwright-report/`

### Need help?
- Check [docs/VISUAL_REGRESSION_TESTING.md](docs/VISUAL_REGRESSION_TESTING.md)
- Review test examples in `tests/visual/`
- Ask in team chat

---

**Issue**: CRO-161 - Testing: Implement Visual Regression Testing for Design System
**Status**: ✅ Complete
