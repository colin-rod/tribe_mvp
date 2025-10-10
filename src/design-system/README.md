# Tribe MVP Design System

A comprehensive, family-friendly design system for the Tribe MVP application built with Next.js, TypeScript, and Tailwind CSS.

## Overview

The Tribe design system provides a consistent, accessible, and warm visual language that reflects the family-focused nature of the platform. It emphasizes usability, accessibility, and emotional connection through carefully crafted components and design tokens.

## Design Principles

### 1. Family-Friendly & Warm
- Warm color palette with orange as the primary brand color
- Soft, rounded corners for approachable feel
- Gentle shadows and subtle animations

### 2. Accessibility-First
- WCAG 2.1 AA compliance as minimum standard
- High contrast ratios for all text combinations
- Focus states for keyboard navigation
- Screen reader optimized markup

### 3. Consistent & Systematic
- Token-based design system
- Consistent spacing and sizing scales
- Reusable component patterns
- Clear naming conventions

### 4. Responsive & Mobile-First
- Mobile-first approach for all components
- Fluid typography and spacing
- Responsive grid system
- Touch-friendly interaction targets

## Design Tokens

### Color System

#### Brand Colors
```css
/* Primary - Warm Orange */
primary-50: #fef7ed
primary-100: #fdedd3
primary-200: #fbd9a6
primary-300: #f8be6e
primary-400: #f59e34
primary-500: #f3841c  /* Main brand color */
primary-600: #c04800  /* WCAG AA compliant - 5.04:1 on white */
primary-700: #bd500f
primary-800: #964114
primary-900: #7a3713
primary-950: #421a07

/* Secondary - Fresh Green */
secondary-50: #f0fdf4
secondary-500: #22c55e  /* Positive actions */
secondary-600: #16a34a

/* Accent - Playful Purple */
accent-50: #fdf4ff
accent-500: #d946ef  /* Highlights */
accent-600: #c026d3
```

#### Semantic Colors
```css
/* Success */
success-500: #22c55e
success-600: #15803d  /* WCAG AA compliant - 4.54:1 on white */

/* Warning */
warning-500: #f59e0b
warning-600: #b45309  /* WCAG AA compliant - 4.52:1 on white */

/* Error */
error-500: #ef4444
error-600: #dc2626

/* Info */
info-500: #3b82f6
info-600: #2563eb
```

#### Neutral Colors
```css
/* Warm grays for family-friendly feel */
neutral-50: #fafaf9
neutral-100: #f5f5f4
neutral-200: #e7e5e4
neutral-300: #d6d3d1
neutral-400: #a8a29e
neutral-500: #78716c
neutral-600: #57534e
neutral-700: #44403c
neutral-800: #292524
neutral-900: #1c1917
neutral-950: #0c0a09
```

### Typography Scale

#### Font Families
- **Primary**: Inter (system-ui fallback)
- **Display**: Inter (for headings and large text)

#### Type Scale
```css
text-xs: 0.75rem (12px)
text-sm: 0.875rem (14px)
text-base: 1rem (16px)
text-lg: 1.125rem (18px)
text-xl: 1.25rem (20px)
text-2xl: 1.5rem (24px)
text-3xl: 1.875rem (30px)
text-4xl: 2.25rem (36px)
text-5xl: 3rem (48px)
text-6xl: 3.75rem (60px)
```

#### Heading Hierarchy
```css
h1, .h1: text-4xl md:text-5xl, font-bold, tracking-tight
h2, .h2: text-3xl md:text-4xl, font-bold, tracking-tight
h3, .h3: text-2xl md:text-3xl, font-semibold, tracking-tight
h4, .h4: text-xl md:text-2xl, font-semibold, tracking-tight
h5, .h5: text-lg md:text-xl, font-semibold
h6, .h6: text-base md:text-lg, font-semibold
```

### Spacing Scale

```css
spacing-xs: 0.25rem (4px)
spacing-sm: 0.5rem (8px)
spacing-md: 1rem (16px)
spacing-lg: 1.5rem (24px)
spacing-xl: 2rem (32px)
spacing-2xl: 3rem (48px)
```

### Border Radius

```css
radius-sm: 0.125rem (2px)
radius-md: 0.375rem (6px)    /* Default - friendly feel */
radius-lg: 0.5rem (8px)
radius-xl: 0.75rem (12px)
radius-2xl: 1rem (16px)
radius-full: 9999px
```

### Shadows

```css
shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05)
shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1)
shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1)
shadow-warm: 0 4px 6px -1px rgb(251 146 60 / 0.1)  /* Warm orange glow */
```

### Navigation Tokens

```css
--navigation-active-indicator: theme('colors.primary.600');
--navigation-active-background: theme('colors.primary.50');
--navigation-active-text: theme('colors.primary.700');
--navigation-hover-background: theme('colors.neutral.100');
--navigation-hover-text: theme('colors.neutral.900');
--navigation-inactive-text: theme('colors.neutral.600');
--navigation-icon-inactive: theme('colors.neutral.500');
--navigation-icon-active: theme('colors.primary.600');
--navigation-indicator-hover-opacity: 0.6;
```

These tokens drive the left-rail navigation component and include high-contrast overrides for `prefers-contrast: more` and `forced-colors` modes.

### Right Pane Tokens

```css
--right-pane-padding-x: 1.5rem; /* 24px */
--right-pane-padding-y: 1.5rem; /* 24px */
--right-pane-section-gap: 1.5rem; /* 24px */
--right-pane-card-radius: 0.875rem; /* 14px */
--right-pane-card-padding-x: 1.25rem; /* 20px */
--right-pane-card-padding-y: 1.125rem; /* 18px */
```

Apply `.right-pane-section` for the base layout and `.right-pane-card`/`.right-pane-card--bordered` for tools and quick stats to ensure the refreshed spacing is consistent across modules.

## Component Library

### Buttons

#### Variants
- **Primary**: Main call-to-action buttons
- **Secondary**: Secondary actions
- **Outline**: Less prominent actions
- **Ghost**: Minimal actions
- **Link**: Text-only buttons
- **Success**: Positive confirmations
- **Warning**: Cautionary actions
- **Destructive**: Dangerous actions

#### Sizes
- **xs**: 24px height - For compact spaces
- **sm**: 32px height - Small actions
- **default**: 40px height - Standard size
- **lg**: 48px height - Prominent actions
- **xl**: 56px height - Hero actions
- **icon**: 40px square - Icon-only buttons

#### Usage Example
```tsx
import { Button } from '@/components/ui/Button'

// Basic usage
<Button>Create Update</Button>

// With variants and sizes
<Button variant=\"primary\" size=\"lg\">
  Share with Family
</Button>

// With loading state
<Button loading variant=\"success\">
  Saving...
</Button>

// With icons
<Button
  leftIcon={<PlusIcon />}
  variant=\"outline\"
>
  Add Child
</Button>
```

### Form Components

#### Input
Enhanced input component with label, help text, error states, and icons.

```tsx
import { Input } from '@/components/ui/Input'

<Input
  label=\"Child's Name\"
  placeholder=\"Enter name\"
  helperText=\"This will be shown in updates\"
  required
/>

<Input
  type=\"password\"
  label=\"Password\"
  showPassword
  errorMessage=\"Password is required\"
/>
```

#### Textarea
Multi-line text input with character counting and resize options.

```tsx
import { Textarea } from '@/components/ui/Textarea'

<Textarea
  label=\"Update Description\"
  placeholder=\"Share what happened today...\"
  maxLength={500}
  showCharCount
  resize=\"vertical\"
/>
```

### Layout Components

#### Container
Responsive container with consistent max-widths and padding.

```tsx
import { Container } from '@/components/ui/Container'

<Container size=\"lg\" padding=\"md\">
  <h1>Page Content</h1>
</Container>
```

#### Grid System
Flexible grid system with responsive breakpoints.

```tsx
import { Grid, GridItem } from '@/components/ui/Grid'

<Grid cols={3} gap=\"lg\" responsive={{ sm: 1, md: 2 }}>
  <GridItem>
    <Card>Content 1</Card>
  </GridItem>
  <GridItem span={2}>
    <Card>Content 2</Card>
  </GridItem>
</Grid>
```

### Feedback Components

#### Alert
Contextual alerts for important information.

```tsx
import { Alert } from '@/components/ui/Alert'

<Alert variant=\"info\" title=\"Welcome to Tribe!\">
  Start by adding your first child to create updates.
</Alert>

<Alert variant=\"success\" dismissible onDismiss={handleDismiss}>
  Update shared successfully with your family!
</Alert>
```

#### Badge
Small status and category indicators.

```tsx
import { Badge } from '@/components/ui/Badge'

<Badge variant=\"success\" dot>
  Active
</Badge>

<Badge variant=\"primary\" outline>
  Family Member
</Badge>
```

### Card Components
Flexible card system for content containers.

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from '@/components/ui/Card'

<Card hover interactive>
  <CardHeader>
    <CardTitle>Emma's First Steps</CardTitle>
    <CardDescription>Shared 2 hours ago</CardDescription>
  </CardHeader>

  <CardContent>
    <p>Emma took her first steps today!</p>
  </CardContent>

  <CardFooter>
    <Button variant=\"outline\">View Details</Button>
  </CardFooter>
</Card>
```

## Accessibility Guidelines

### Color Contrast
All color combinations meet WCAG 2.1 AA standards:
- Normal text: 4.5:1 minimum contrast ratio
- Large text: 3:1 minimum contrast ratio
- Non-text elements: 3:1 minimum contrast ratio

### Focus Management
- All interactive elements have visible focus states
- Focus rings use the primary color with 2px width
- Focus order follows logical tab sequence
- Skip links provided for main navigation

### Keyboard Navigation
- All functionality available via keyboard
- Escape key closes modals and dropdowns
- Arrow keys navigate within components
- Enter/Space activate buttons and links

### Screen Reader Support
- Semantic HTML structure
- ARIA labels and descriptions where needed
- Live regions for dynamic content
- Alternative text for images

### Touch Targets
- Minimum 44x44px touch targets on mobile
- Adequate spacing between interactive elements
- Hover states adapted for touch devices

## Animation Guidelines

### Principles
- **Subtle and Purposeful**: Animations should enhance UX, not distract
- **Fast and Responsive**: Keep durations under 300ms for most interactions
- **Consistent Easing**: Use CSS ease or ease-out for natural movement

### Available Animations
```css
/* Fade animations */
animate-fade-in: fadeIn 0.5s ease-in-out
animate-slide-up: slideUp 0.3s ease-out
animate-bounce-gentle: bounceGentle 2s infinite

/* Transition utilities */
transition-fast: 150ms ease
transition-base: 200ms ease
transition-slow: 300ms ease
```

### Usage Guidelines
- Use fade-in for new content appearing
- Use slide-up for modals and drawers
- Use gentle bounce for loading states
- Avoid overusing animations - less is more

## Responsive Design

### Breakpoints
```css
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1536px
```

### Mobile-First Approach
- Design and code for mobile first
- Progressive enhancement for larger screens
- Touch-friendly interaction targets (44px minimum)
- Readable text without zooming (16px base)

### Responsive Typography
Use responsive text utilities for fluid scaling:
```css
text-responsive-xl: text-lg md:text-xl lg:text-2xl
text-responsive-lg: text-base md:text-lg lg:text-xl
text-responsive-base: text-sm md:text-base lg:text-lg
```

## Implementation Guide

### Setup
1. Install dependencies (already included in project):
   ```bash
   npm install tailwindcss @tailwindcss/forms
   npm install clsx tailwind-merge
   ```

2. Import global styles in your app:
   ```tsx
   import '@/app/globals.css'
   import '@/styles/typography.css'
   ```

### Using Components
```tsx
// Import individual components
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'

// Use with TypeScript for full type safety
const MyComponent: React.FC = () => {
  return (
    <Card padding=\"lg\">
      <Input
        label=\"Name\"
        placeholder=\"Enter name\"
        required
      />
      <Button variant=\"primary\" className=\"mt-4\">
        Submit
      </Button>
    </Card>
  )
}
```

### Custom Styling
Use the `cn()` utility function to merge classes safely:
```tsx
import { cn } from '@/lib/utils'

<Button
  className={cn(
    'custom-class',
    condition && 'conditional-class'
  )}
>
  Button
</Button>
```

## Best Practices

### Component Development
1. **Use forwardRef**: Always forward refs for DOM elements
2. **TypeScript interfaces**: Define clear prop interfaces
3. **Accessibility**: Include ARIA attributes and semantic markup
4. **Variants**: Use consistent variant patterns across components
5. **Composition**: Prefer composition over complex prop APIs

### Styling Guidelines
1. **Use design tokens**: Reference tokens instead of arbitrary values
2. **Consistent spacing**: Use the spacing scale for margins and padding
3. **Semantic classes**: Use utility classes that describe intent
4. **Mobile-first**: Write mobile styles first, enhance for desktop
5. **Performance**: Avoid arbitrary values that can't be optimized

### Testing Components
1. **Accessibility testing**: Use axe-core and screen readers
2. **Keyboard testing**: Ensure all functionality works via keyboard
3. **Visual regression**: Test components across browsers and devices
4. **Unit testing**: Test component props and interactions

## Contributing

When adding new components or modifying existing ones:

1. Follow the established patterns and conventions
2. Include proper TypeScript types
3. Add accessibility attributes and considerations
4. Test across devices and browsers
5. Update documentation with examples
6. Consider responsive behavior
7. Maintain consistency with the design system

## Resources

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [React Accessibility](https://reactjs.org/docs/accessibility.html)
- [Color Contrast Checker](https://webaim.org/resources/contrastchecker/)

---

*This design system is living document that evolves with the Tribe MVP platform. For questions or contributions, please refer to the project's contribution guidelines.*