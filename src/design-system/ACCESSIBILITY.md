# Accessibility Guidelines

## Overview

This document outlines accessibility standards and best practices for the Tribe MVP design system. All components must meet WCAG 2.1 Level AA compliance standards.

## Quick Reference

### ✅ Checklist for New Components

- [ ] All interactive elements meet 44x44px minimum touch target
- [ ] Keyboard navigation works (Tab, Enter, Space, Escape)
- [ ] Focus indicators are visible (3:1 contrast minimum)
- [ ] Color contrast meets 4.5:1 for normal text, 3:1 for large text
- [ ] Proper ARIA labels and attributes
- [ ] Form inputs linked to labels via `htmlFor` and `id`
- [ ] Error messages use `role="alert"` and `aria-live="polite"`
- [ ] Images have `alt` text
- [ ] Icon-only buttons have `aria-label`
- [ ] No accessibility violations in axe-core tests

## Standards

### WCAG 2.1 Level AA Compliance

We follow [WCAG 2.1 Level AA](https://www.w3.org/WAI/WCAG21/quickref/?currentsidebar=%23col_customize&levels=aaa) standards:

- **Perceivable**: Users can perceive the information being presented
- **Operable**: Users can operate the interface (keyboard, mouse, touch)
- **Understandable**: Users can understand the information and interface
- **Robust**: Content works with current and future assistive technologies

## Touch Targets (WCAG 2.5.5)

### Minimum Sizes

All interactive elements must meet these minimum sizes:

| Element Type | Minimum Size | Tailwind Class |
|-------------|--------------|----------------|
| Small buttons | 44x44px | `h-11 w-11` or `min-touch-target` |
| Default buttons | 44x44px | `h-11` |
| Touch targets | 44x44px | `min-touch-target` |
| Large targets | 56x56px | `h-touch-lg w-touch-lg` |

### Implementation

```tsx
// ✅ Good - Meets 44px minimum
<Button size="sm">Submit</Button>

// ✅ Good - Icon button with minimum size
<Button size="icon" aria-label="Close">
  <XIcon />
</Button>

// ❌ Bad - Too small
<button className="h-6 w-6">×</button>
```

## Keyboard Navigation

### Required Keyboard Support

| Key | Action |
|-----|--------|
| **Tab** | Move focus to next interactive element |
| **Shift + Tab** | Move focus to previous interactive element |
| **Enter** | Activate buttons, links, submit forms |
| **Space** | Activate buttons, toggle checkboxes |
| **Escape** | Close modals, dropdowns, dismiss overlays |
| **Arrow keys** | Navigate menus, tabs, radio groups |

### Focus Management

#### Skip Links

Always include skip links at the top of pages:

```tsx
import { SkipLinks, SkipLink } from '@/components/ui/SkipLink'

<SkipLinks>
  <SkipLink href="#main-content">Skip to main content</SkipLink>
  <SkipLink href="#navigation">Skip to navigation</SkipLink>
</SkipLinks>
```

#### Focus Trap in Modals

Use `useFocusTrap` hook for modals and dialogs:

```tsx
import { useFocusTrap } from '@/hooks/useFocusTrap'

function Modal({ isOpen, onClose }) {
  const trapRef = useFocusTrap(isOpen, onClose)

  return (
    <div ref={trapRef} role="dialog" aria-modal="true">
      {/* Modal content */}
    </div>
  )
}
```

#### Focus Indicators

All interactive elements must have visible focus indicators:

```tsx
// ✅ Good - Visible focus ring
<button className="focus-visible:ring-2 focus-visible:ring-primary-500">
  Click me
</button>

// ✅ Good - Enhanced focus for better visibility
<button className="focus-visible-enhanced">
  Click me
</button>
```

## Color Contrast (WCAG 1.4.3)

### Standards

- **Normal text** (< 18pt): 4.5:1 minimum contrast ratio
- **Large text** (≥ 18pt or ≥ 14pt bold): 3:1 minimum contrast ratio
- **UI components** (buttons, form controls): 3:1 minimum
- **Focus indicators**: 3:1 minimum against adjacent colors

### Testing Contrast

Use the built-in utility:

```ts
import { meetsWCAGStandard } from '@/utils/a11y'

const result = meetsWCAGStandard('#f3841c', '#ffffff', false)
console.log(result.passes) // true if passes WCAG AA
console.log(result.ratio) // e.g., 4.52
```

### Approved Color Combinations

#### Text on White Background

| Color | Contrast Ratio | Normal Text | Large Text |
|-------|---------------|-------------|------------|
| `primary-600` | 5.1:1 | ✅ | ✅ |
| `primary-700` | 7.2:1 | ✅ | ✅ |
| `neutral-700` | 8.4:1 | ✅ | ✅ |
| `neutral-900` | 15.1:1 | ✅ | ✅ |
| `error-600` | 5.5:1 | ✅ | ✅ |
| `success-600` | 4.7:1 | ✅ | ✅ |

#### White Text on Colored Backgrounds

| Background | Contrast Ratio | Normal Text | Large Text |
|-----------|---------------|-------------|------------|
| `primary-500` | 4.6:1 | ✅ | ✅ |
| `primary-600` | 5.9:1 | ✅ | ✅ |
| `error-500` | 4.7:1 | ✅ | ✅ |
| `success-600` | 4.7:1 | ✅ | ✅ |

## ARIA Labels and Attributes

### Form Controls

All form inputs must have accessible labels:

```tsx
// ✅ Good - Visible label
<Input
  label="Email Address"
  id="email"
  type="email"
  required
/>

// ✅ Good - Screen reader only label
<Input
  aria-label="Search"
  type="search"
/>

// ❌ Bad - No label
<input type="email" />
```

### Error Messages

Link error messages to inputs:

```tsx
// ✅ Good - Error linked via aria-describedby
<Input
  id="email"
  label="Email"
  errorMessage="Please enter a valid email"
  aria-invalid="true"
/>

// Component automatically adds:
// - aria-describedby="email-error"
// - role="alert" on error message
// - aria-live="polite" for screen reader announcement
```

### Icon-Only Buttons

Always provide text alternatives:

```tsx
// ✅ Good - Has aria-label
<Button size="icon" aria-label="Close dialog">
  <XIcon />
</Button>

// ❌ Bad - No accessible name
<Button size="icon">
  <XIcon />
</Button>
```

### Loading States

Announce loading states to screen readers:

```tsx
// ✅ Good - Loading state announced
<Button loading>
  Submit
</Button>

// Component automatically adds:
// - aria-busy="true"
// - Hidden "Loading..." text for screen readers
```

## Screen Reader Support

### Screen Reader Only Text

Use the `.sr-only` utility for screen reader only content:

```tsx
<button>
  <TrashIcon />
  <span className="sr-only">Delete item</span>
</button>
```

### Live Regions

Announce dynamic content changes:

```ts
import { announceToScreenReader } from '@/utils/a11y'

// Polite announcement (won't interrupt)
announceToScreenReader('Item added to cart')

// Assertive announcement (interrupts current speech)
announceToScreenReader('Error: Form submission failed', 'assertive')
```

### Skip Link Focus

Skip links appear only when focused:

```tsx
<SkipLink href="#main">
  Skip to main content
</SkipLink>

// Automatically hidden until focused via keyboard
// Uses .sr-only-focusable utility
```

## Testing

### Automated Testing

All components must pass axe-core tests:

```tsx
import { render } from '@testing-library/react'
import { axe } from '@/__tests__/setup/axe'
import { Button } from './Button'

test('Button has no accessibility violations', async () => {
  const { container } = render(<Button>Click me</Button>)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

### Manual Testing Checklist

- [ ] **Keyboard only**: Navigate without a mouse
- [ ] **Screen reader**: Test with NVDA (Windows) or VoiceOver (Mac)
- [ ] **Zoom**: Test at 200% zoom level
- [ ] **Color blindness**: Use color blindness simulators
- [ ] **Touch devices**: Test on mobile/tablet devices
- [ ] **High contrast**: Test with high contrast mode enabled

### Running Tests

```bash
# Run all accessibility tests
npm test -- a11y

# Run color contrast audit
npm test -- color-contrast

# Run with coverage
npm run test:coverage
```

## Common Patterns

### Modal Dialog

```tsx
import { useFocusTrap } from '@/hooks/useFocusTrap'

function Dialog({ isOpen, onClose, title }) {
  const trapRef = useFocusTrap(isOpen, onClose)

  if (!isOpen) return null

  return (
    <div
      ref={trapRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      <h2 id="dialog-title">{title}</h2>
      {/* Dialog content */}
      <button onClick={onClose} aria-label="Close dialog">
        ×
      </button>
    </div>
  )
}
```

### Form Validation

```tsx
<form onSubmit={handleSubmit}>
  <Input
    id="email"
    label="Email Address"
    type="email"
    required
    errorMessage={errors.email}
    helperText="We'll never share your email"
  />

  <Button type="submit" loading={isSubmitting}>
    {isSubmitting ? 'Submitting...' : 'Submit'}
  </Button>
</form>
```

### Navigation Menu

```tsx
<nav aria-label="Main navigation">
  <ul role="list">
    <li>
      <a href="/" aria-current={isHome ? 'page' : undefined}>
        Home
      </a>
    </li>
    {/* More nav items */}
  </ul>
</nav>
```

## Resources

### Tools

- **axe DevTools**: Browser extension for accessibility testing
- **WAVE**: Web accessibility evaluation tool
- **Color Contrast Analyzer**: Desktop app for checking contrast
- **NVDA**: Free screen reader for Windows
- **VoiceOver**: Built-in screen reader for Mac/iOS

### Documentation

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [A11Y Project Checklist](https://www.a11yproject.com/checklist/)
- [WebAIM Resources](https://webaim.org/resources/)

### Internal Files

- `src/utils/a11y.ts` - Accessibility utility functions
- `src/hooks/useFocusTrap.ts` - Focus trap hook for modals
- `src/components/ui/SkipLink.tsx` - Skip navigation component
- `src/__tests__/setup/axe.ts` - Jest axe configuration

## Getting Help

If you're unsure about accessibility requirements:

1. Check this document first
2. Review existing component examples
3. Run automated tests (`npm test -- a11y`)
4. Ask in #accessibility Slack channel
5. Consult with UX team for complex patterns

## Enforcement

- **Pre-commit**: ESLint jsx-a11y rules catch common issues
- **CI/CD**: Automated axe tests run on every pull request
- **Code Review**: Reviewers check for accessibility compliance
- **Storybook**: A11y addon highlights violations in development

---

**Remember**: Accessibility is not optional. It's a legal requirement and ensures everyone can use our application regardless of their abilities.
