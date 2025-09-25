# Storybook for Tribe MVP

This directory contains the Storybook configuration for the Tribe MVP project - a comprehensive component library and development environment for your baby update sharing platform.

## 🚀 Quick Start

```bash
npm run storybook
```

This will start Storybook on [http://localhost:6006](http://localhost:6006)

## 📚 What's Included

### UI Components
- **Button** - Multiple variants (default, destructive, outline, secondary, ghost, link, success, warning) and sizes
- **Card** - Flexible container with sub-components (Header, Title, Description, Content, Footer)
- **Input** - Form input with validation states, icons, and password visibility toggle
- **Textarea** - Multi-line input with character counting and resize options
- **LoadingSpinner** - Animated loading indicator in multiple sizes
- **Alert** - Notification component with dismissible options and variants
- **Badge** - Status indicators and labels with dots and outline styles

### Complex Components
- **UpdateCard** - Display baby update previews with child info, response counts, and distribution status
- **ChildCard** - Show child information with photos, age calculation, and action buttons

## 🛠 Configuration

### Main Configuration (`main.ts`)
- **Framework**: Next.js with Vite
- **Addons**:
  - Controls for interactive props
  - Actions for event handling
  - Accessibility testing (a11y)
  - Viewport testing for responsive design
  - Background switching
  - Documentation generation
  - Visual testing integration

### Preview Configuration (`preview.ts`)
- **Styling**: Tailwind CSS integration via custom global.css
- **Backgrounds**: Light, dark, and white options
- **Viewports**: Mobile, tablet, desktop, and large desktop
- **Accessibility**: Color contrast checking enabled

### Mock Data (`mocks.tsx`)
- Mock providers for authentication context
- Sample data for children, recipients, updates, and responses
- Helper functions to generate test data
- Performance metrics mocking

## 🎨 Design System

### Color Variants
All components follow a consistent color system:
- **Primary**: Main brand colors for primary actions
- **Success**: Green variants for positive feedback
- **Warning**: Orange/yellow for caution states
- **Error**: Red variants for errors and destructive actions
- **Info**: Blue variants for informational content

### Responsive Design
Stories include viewport testing for:
- Mobile: 375px width
- Tablet: 768px width
- Desktop: 1024px width
- Large Desktop: 1440px width

## ♿ Accessibility

- **Color Contrast**: All components tested for WCAG compliance
- **Keyboard Navigation**: Full keyboard support for interactive elements
- **Screen Readers**: Proper ARIA labels and semantic markup
- **Focus Management**: Visible focus indicators

## 📖 Story Organization

Stories are organized by category:
- `UI/` - Basic UI components (Button, Input, Card, etc.)
- `Components/` - Complex application components (UpdateCard, ChildCard)

Each story includes:
- **Default examples** - Basic usage
- **Variant examples** - All visual variants
- **Interactive examples** - With controls for testing
- **Real-world examples** - Practical use cases
- **Edge cases** - Boundary conditions and error states

## 🔧 Development

### Adding New Stories
1. Create a `.stories.tsx` file next to your component
2. Import the component and necessary dependencies
3. Define the meta object with component info and controls
4. Export story variants as named exports
5. Include accessibility and responsive testing examples

### Mock Data
Use the provided mock data generators in `.storybook/mocks.tsx`:
```typescript
import { generateMockChild, generateMockUpdate } from '../.storybook/mocks'

const mockData = generateMockChild({ name: 'Emma', age: '11 months' })
```

### Testing
- **Visual Testing**: Screenshots automatically generated for visual regression
- **Accessibility Testing**: Run `npm run test-storybook` for accessibility checks
- **Interactive Testing**: Use the Controls panel to test component props

## 🌟 Best Practices

1. **Comprehensive Coverage**: Include all prop combinations and edge cases
2. **Real-world Examples**: Show practical usage patterns
3. **Accessibility First**: Test with screen readers and keyboard navigation
4. **Responsive Design**: Test across all viewport sizes
5. **Documentation**: Include clear descriptions and usage guidelines

## 🚀 Deployment

Build static Storybook for deployment:
```bash
npm run build-storybook
```

This creates a `storybook-static` folder ready for hosting.