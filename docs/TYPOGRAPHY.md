# Typography System Documentation

## Overview

The Tribe MVP typography system is built on a **Major Third (1.25 ratio)** type scale, providing consistent, harmonious text sizing across the application. The system prioritizes readability, accessibility, and semantic HTML structure.

## Type Scale

### Base Configuration
- **Base size**: 16px (1rem)
- **Scale ratio**: 1.25 (Major Third)
- **Font family**: Inter with system fallbacks
- **Line height**: Optimized for readability (1.625 for body text)

### Size Scale

| Token | Size | Line Height | Use Case |
|-------|------|-------------|----------|
| `text-xs` | 12px (0.75rem) | 18px | Captions, labels, metadata |
| `text-sm` | 14px (0.875rem) | 22px | Secondary text, helper text |
| `text-base` | 16px (1rem) | 26px | Body text, paragraphs |
| `text-lg` | 18px (1.125rem) | 28px | Emphasized body text |
| `text-xl` | 20px (1.25rem) | 30px | Large body text, h6 |
| `text-2xl` | 25px (1.563rem) | 32px | h5 headings |
| `text-3xl` | 31.25px (1.953rem) | 38px | h4 headings |
| `text-4xl` | 39px (2.441rem) | 46px | h3 headings |
| `text-5xl` | 48.8px (3.052rem) | 54px | h2 headings |
| `text-6xl` | 61px (3.815rem) | 64px | h1 headings |
| `text-7xl` | 76.3px (4.768rem) | 76px | Display medium |
| `text-8xl` | 95.4px (5.96rem) | 92px | Display large |
| `text-9xl` | 119.2px (7.451rem) | 112px | Display extra-large |

## Semantic Heading Hierarchy

Always use semantic HTML heading tags (h1-h6) for proper document structure and accessibility.

### HTML Tags

```tsx
<h1>Page Title</h1>           {/* text-6xl, 61px */}
<h2>Section Title</h2>         {/* text-5xl, 48.8px */}
<h3>Subsection Title</h3>      {/* text-4xl, 39px */}
<h4>Component Title</h4>       {/* text-3xl, 31.25px */}
<h5>Small Heading</h5>         {/* text-2xl, 25px */}
<h6>Tiny Heading</h6>          {/* text-xl, 20px */}
```

### Utility Classes

When semantic HTML doesn't match your visual hierarchy, use utility classes:

```tsx
{/* Semantic h2, but styled as h1 */}
<h2 className="h1">Visual H1 Style</h2>

{/* Div styled as heading */}
<div className="h3">Styled as H3</div>
```

## Typography Components

### Heading Component

Recommended approach for reusable, type-safe headings:

```tsx
import { Heading } from '@/components/ui/Typography'

// Basic usage - semantic and visual level match
<Heading level={1}>Page Title</Heading>

// Decouple semantic from visual
<Heading level={2} styleAs={1}>
  Section that looks like H1
</Heading>

// Responsive scaling
<Heading level={1} responsive>
  Scales across breakpoints
</Heading>
```

**Props:**
- `level` (1-6): Semantic heading level (HTML tag)
- `styleAs` (1-6): Visual style override
- `responsive`: Enable responsive scaling
- `className`: Additional CSS classes

### Text Component

For body text and other non-heading content:

```tsx
import { Text } from '@/components/ui/Typography'

// Body text variants
<Text variant="body">Default body text</Text>
<Text variant="body-lg">Large body text</Text>
<Text variant="body-sm">Small body text</Text>
<Text variant="caption">Caption text</Text>
<Text variant="overline">OVERLINE TEXT</Text>

// Color presets
<Text color="muted">Muted text</Text>
<Text color="brand">Brand-colored text</Text>
<Text color="error">Error message</Text>

// Render as different element
<Text as="span" variant="body-sm">Inline text</Text>

// Responsive
<Text responsive>Scales across breakpoints</Text>
```

**Variants:**
- `body`: Default 16px body text
- `body-lg`: 18px emphasized body text
- `body-sm`: 14px secondary text
- `body-xs`: 12px small text
- `caption`: 14px medium weight labels
- `overline`: 12px uppercase labels

**Color Presets:**
- `default`: neutral-700
- `muted`: neutral-500
- `subtle`: neutral-600
- `emphasis`: neutral-900 medium weight
- `brand`: primary-600
- `success`: success-600
- `warning`: warning-600
- `error`: error-600
- `info`: info-600

### Display Component

For hero sections and extra-large decorative text:

```tsx
import { Display } from '@/components/ui/Typography'

<Display size="xl">Extra Large Hero</Display>  {/* 119.2px */}
<Display size="lg">Large Hero</Display>        {/* 95.4px */}
<Display size="md">Medium Hero</Display>       {/* 76.3px */}

// Control semantic tag
<Display as="h2" size="lg">Hero as H2</Display>
```

### Link Component

Styled text links:

```tsx
import { LinkText } from '@/components/ui/Typography'

<LinkText href="/about">Default link</LinkText>
<LinkText variant="subtle" href="/help">Subtle link</LinkText>
```

### Code Component

For code snippets:

```tsx
import { Code } from '@/components/ui/Typography'

// Inline code
<Code>const foo = 'bar'</Code>

// Code block
<Code block>
{`function hello() {
  return 'world'
}`}
</Code>
```

## Responsive Typography

### Responsive Heading Classes

```tsx
{/* Scales: 3xl → 4xl (sm) → 5xl (lg) */}
<h1 className="heading-md-responsive">
  Responsive Heading
</h1>
```

Available classes:
- `.heading-xl-responsive`: 5xl → 6xl → 7xl
- `.heading-lg-responsive`: 4xl → 5xl → 6xl
- `.heading-md-responsive`: 3xl → 4xl → 5xl
- `.heading-sm-responsive`: 2xl → 3xl → 4xl

### Responsive Body Text

```tsx
{/* Scales: sm → base (sm) → lg (lg) */}
<p className="text-responsive-base">
  Responsive body text
</p>
```

Available classes:
- `.text-responsive-xl`: lg → xl → 2xl
- `.text-responsive-lg`: base → lg → xl
- `.text-responsive-base`: sm → base → lg
- `.text-responsive-sm`: xs → sm → base

## Font Weights

Use semantic weight utilities:

```tsx
<p className="font-normal">Normal (400)</p>
<p className="font-medium">Medium (500)</p>
<p className="font-semibold">Semibold (600)</p>
<p className="font-bold">Bold (700)</p>
```

## Letter Spacing

Headings have built-in negative letter spacing. For custom control:

```tsx
<h1 className="tracking-tighter">Extra tight (-0.05em)</h1>
<h2 className="tracking-tight">Tight (-0.025em)</h2>
<p className="tracking-normal">Normal (0)</p>
<span className="tracking-wide">Wide (0.025em)</span>
```

## Text Colors

### Using CSS Classes

```tsx
<p className="text-neutral-700">Default body text</p>
<p className="text-neutral-500">Muted text</p>
<p className="text-primary-600">Brand text</p>
```

### Using Semantic Classes

```tsx
<span className="text-muted">Muted</span>
<span className="text-subtle">Subtle</span>
<span className="text-emphasis">Emphasis</span>
<span className="text-brand">Brand</span>
<span className="text-success">Success</span>
<span className="text-warning">Warning</span>
<span className="text-error">Error</span>
```

## Best Practices

### ✅ DO

- **Use semantic HTML**: Always use proper heading hierarchy (h1-h6)
- **One h1 per page**: Each page should have exactly one h1
- **Skip-proof hierarchy**: Don't skip heading levels (h2 → h4)
- **Component approach**: Use Typography components for consistency
- **Responsive text**: Use responsive classes for hero sections and landing pages
- **Accessible colors**: Text colors meet WCAG AA contrast requirements

```tsx
// ✅ Good - semantic structure with consistent styling
<Heading level={1}>Page Title</Heading>
<Heading level={2}>Section</Heading>
<Heading level={3}>Subsection</Heading>
<Text variant="body">Content here</Text>
```

### ❌ DON'T

- **Don't skip levels**: Never go h1 → h3
- **Don't use for layout**: Don't choose headings based on size alone
- **Don't mix systems**: Avoid mixing arbitrary sizes with system scale
- **Don't use gray-X**: Use neutral-X for consistency

```tsx
// ❌ Bad - skipped h2, wrong color tokens
<h1>Title</h1>
<h3>Section</h3>  {/* Should be h2 */}
<p className="text-[14px] text-gray-600">Text</p>  {/* Use system classes */}
```

### Semantic HTML Structure

```tsx
// ✅ Good document outline
<article>
  <h1>Article Title</h1>           {/* Level 1 */}
  <section>
    <h2>Introduction</h2>           {/* Level 2 */}
    <p>Content...</p>
  </section>
  <section>
    <h2>Main Content</h2>           {/* Level 2 */}
    <h3>Subsection A</h3>           {/* Level 3 */}
    <p>Content...</p>
    <h3>Subsection B</h3>           {/* Level 3 */}
    <p>Content...</p>
  </section>
</article>
```

## Accessibility

### Screen Readers

Proper heading hierarchy enables screen reader users to navigate efficiently:

- Screen readers announce heading levels
- Users can jump between headings
- Document outline provides page structure

### Contrast Ratios

All text colors meet WCAG AA standards:
- Large text (18pt+): 3:1 minimum
- Normal text: 4.5:1 minimum
- Our system: 4.5:1+ for all text on white backgrounds

### Focus States

Interactive text elements have visible focus indicators:

```tsx
<LinkText href="/about">
  Accessible link with focus ring
</LinkText>
```

## Examples

### Landing Page Hero

```tsx
<section className="py-16 text-center">
  <Display size="lg" className="mb-4">
    Welcome to Tribe
  </Display>
  <Text variant="body-lg" color="subtle" className="max-w-2xl mx-auto">
    Share your baby's precious moments with family in a private,
    secure environment.
  </Text>
</section>
```

### Article Content

```tsx
<article>
  <Heading level={1} className="mb-4">
    Getting Started Guide
  </Heading>

  <Text variant="body-lg" className="mb-8">
    Learn how to set up your Tribe account and start sharing updates
    with your family.
  </Text>

  <Heading level={2} className="mb-3">
    Step 1: Create Your Account
  </Heading>

  <Text variant="body" className="mb-6">
    First, visit the signup page and enter your information...
  </Text>
</article>
```

### Card Component

```tsx
<Card>
  <Heading level={3} className="mb-2">
    Recent Update
  </Heading>
  <Text variant="body-sm" color="muted" className="mb-4">
    Posted 2 hours ago
  </Text>
  <Text variant="body">
    Baby took her first steps today! So proud of our little one.
  </Text>
</Card>
```

### Form Labels

```tsx
<label>
  <Text as="span" variant="body-sm" color="emphasis" className="block mb-2">
    Email Address
  </Text>
  <Input type="email" />
  <Text as="span" variant="caption" color="muted" className="mt-1 block">
    We'll never share your email with anyone else.
  </Text>
</label>
```

## Migration Guide

### From Old to New System

#### Component Props Pattern

```tsx
// ❌ Old - inconsistent prop naming
<UpdateCard
  title="Update"
  titleSize="large"
  description="Content"
/>

// ✅ New - use Typography components
<UpdateCard>
  <Heading level={3}>Update</Heading>
  <Text variant="body">Content</Text>
</UpdateCard>
```

#### Arbitrary Values

```tsx
// ❌ Old - arbitrary sizing
<h2 className="text-[28px] leading-[34px]">Title</h2>

// ✅ New - use type scale
<Heading level={2}>Title</Heading>
```

#### Color Tokens

```tsx
// ❌ Old - gray-X colors
<p className="text-gray-600">Text</p>

// ✅ New - neutral-X colors
<Text color="subtle">Text</Text>
```

## Technical Details

### Tailwind Configuration

The typography system is configured in `tailwind.config.js`:

```js
fontSize: {
  // Major Third scale (1.25 ratio)
  'xs': ['0.75rem', { lineHeight: '1.125rem' }],
  'sm': ['0.875rem', { lineHeight: '1.375rem' }],
  'base': ['1rem', { lineHeight: '1.625rem' }],
  // ... continues with full scale
}
```

### CSS Classes

Global typography styles are in `src/styles/typography.css`:

```css
h1, .h1 {
  @apply text-6xl font-bold text-neutral-900;
}
```

### Component Implementation

Typography components are in `src/components/ui/Typography.tsx`.

## Resources

- [Type Scale Calculator](https://typescale.com/) - Visualize type scales
- [Modular Scale](https://www.modularscale.com/) - Calculate ratios
- [WCAG Contrast Checker](https://webaim.org/resources/contrastchecker/) - Verify accessibility
- [Inter Font](https://rsms.me/inter/) - Our typeface

## Support

For questions or issues with the typography system:
1. Check this documentation first
2. Review the StyleGuide component at `/dashboard/design-system`
3. Consult with the design team
4. Create an issue in Linear with the `design-system` label
