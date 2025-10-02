/**
 * Style Guide Component
 *
 * A comprehensive showcase of the Tribe MVP design system.
 * This component can be used for development, testing, and documentation.
 */

import React from 'react'
import { Container } from '@/components/ui/Container'
import {
  Button,
  Input,
  Textarea,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Alert,
  Grid,
  GridItem
} from '@/components/ui'
import { cn } from '@/lib/utils'
import {
  BabyUpdateCard,
  CreateUpdateForm,
  LayoutShowcase
} from '@/design-system/examples'

interface StyleGuideProps {
  section?: 'all' | 'colors' | 'typography' | 'components' | 'examples'
}

const ColorSwatch: React.FC<{ color: string; name: string; hex?: string }> = ({ color, name, hex }) => (
  <div className="flex flex-col" role="img" aria-label={`Color swatch: ${name}${hex ? `, hex ${hex}` : ''}`}>
    <div className={cn('h-20 w-full rounded-lg border border-neutral-200 shadow-sm', color)} aria-hidden="true" />
    <div className="mt-2 text-sm">
      <div className="font-medium text-neutral-900">{name}</div>
      {hex && <div className="text-neutral-500 font-mono text-xs">{hex}</div>}
    </div>
  </div>
)

const SECTIONS = {
  colors: {
    title: 'Color Palette',
    component: (
      <div className="space-y-12">
        {/* Primary Colors */}
        <div>
          <h3 className="h3 mb-6">Primary - Warm Orange</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-11 gap-4">
            <ColorSwatch color="bg-primary-50" name="50" hex="#fef7ed" />
            <ColorSwatch color="bg-primary-100" name="100" hex="#fdedd3" />
            <ColorSwatch color="bg-primary-200" name="200" hex="#fbd9a6" />
            <ColorSwatch color="bg-primary-300" name="300" hex="#f8be6e" />
            <ColorSwatch color="bg-primary-400" name="400" hex="#f59e34" />
            <ColorSwatch color="bg-primary-500" name="500" hex="#f3841c" />
            <ColorSwatch color="bg-primary-600" name="600" hex="#e4690f" />
            <ColorSwatch color="bg-primary-700" name="700" hex="#bd500f" />
            <ColorSwatch color="bg-primary-800" name="800" hex="#964114" />
            <ColorSwatch color="bg-primary-900" name="900" hex="#7a3713" />
            <ColorSwatch color="bg-primary-950" name="950" hex="#421a07" />
          </div>
        </div>

        {/* Semantic Colors */}
        <div>
          <h3 className="h3 mb-6">Semantic Colors</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <h4 className="font-semibold text-neutral-700 mb-3">Success</h4>
              <div className="space-y-2">
                <ColorSwatch color="bg-success-500" name="500" hex="#22c55e" />
                <ColorSwatch color="bg-success-600" name="600" hex="#16a34a" />
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-neutral-700 mb-3">Warning</h4>
              <div className="space-y-2">
                <ColorSwatch color="bg-warning-500" name="500" hex="#f59e0b" />
                <ColorSwatch color="bg-warning-600" name="600" hex="#d97706" />
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-neutral-700 mb-3">Error</h4>
              <div className="space-y-2">
                <ColorSwatch color="bg-error-500" name="500" hex="#ef4444" />
                <ColorSwatch color="bg-error-600" name="600" hex="#dc2626" />
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-neutral-700 mb-3">Info</h4>
              <div className="space-y-2">
                <ColorSwatch color="bg-info-500" name="500" hex="#3b82f6" />
                <ColorSwatch color="bg-info-600" name="600" hex="#2563eb" />
              </div>
            </div>
          </div>
        </div>

        {/* Neutral Colors */}
        <div>
          <h3 className="h3 mb-6">Neutral - Warm Grays</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-11 gap-4">
            <ColorSwatch color="bg-neutral-50" name="50" hex="#fafaf9" />
            <ColorSwatch color="bg-neutral-100" name="100" hex="#f5f5f4" />
            <ColorSwatch color="bg-neutral-200" name="200" hex="#e7e5e4" />
            <ColorSwatch color="bg-neutral-300" name="300" hex="#d6d3d1" />
            <ColorSwatch color="bg-neutral-400" name="400" hex="#a8a29e" />
            <ColorSwatch color="bg-neutral-500" name="500" hex="#78716c" />
            <ColorSwatch color="bg-neutral-600" name="600" hex="#57534e" />
            <ColorSwatch color="bg-neutral-700" name="700" hex="#44403c" />
            <ColorSwatch color="bg-neutral-800" name="800" hex="#292524" />
            <ColorSwatch color="bg-neutral-900" name="900" hex="#1c1917" />
            <ColorSwatch color="bg-neutral-950" name="950" hex="#0c0a09" />
          </div>
        </div>
      </div>
    )
  },
  typography: {
    title: 'Typography',
    component: (
      <div className="space-y-12">
        {/* Type Scale Info */}
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-6">
          <h3 className="text-2xl font-bold text-neutral-900 mb-3">Typography System</h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-semibold text-neutral-900">Scale Ratio:</span>
              <span className="text-neutral-700 ml-2">Major Third (1.25)</span>
            </div>
            <div>
              <span className="font-semibold text-neutral-900">Base Size:</span>
              <span className="text-neutral-700 ml-2">16px (1rem)</span>
            </div>
            <div>
              <span className="font-semibold text-neutral-900">Font Family:</span>
              <span className="text-neutral-700 ml-2">Inter</span>
            </div>
          </div>
        </div>

        {/* Heading Hierarchy */}
        <div>
          <h3 className="text-2xl font-bold text-neutral-900 mb-6">Heading Hierarchy</h3>
          <div className="space-y-6 bg-white p-8 rounded-lg border border-neutral-200">
            <div>
              <div className="text-xs font-mono text-neutral-500 mb-2">
                h1, .h1 - 61px / text-6xl
              </div>
              <h1 className="h1">The quick brown fox jumps</h1>
            </div>
            <div>
              <div className="text-xs font-mono text-neutral-500 mb-2">
                h2, .h2 - 48.8px / text-5xl
              </div>
              <h2 className="h2">The quick brown fox jumps</h2>
            </div>
            <div>
              <div className="text-xs font-mono text-neutral-500 mb-2">
                h3, .h3 - 39px / text-4xl
              </div>
              <h3 className="h3">The quick brown fox jumps</h3>
            </div>
            <div>
              <div className="text-xs font-mono text-neutral-500 mb-2">
                h4, .h4 - 31.25px / text-3xl
              </div>
              <h4 className="h4">The quick brown fox jumps</h4>
            </div>
            <div>
              <div className="text-xs font-mono text-neutral-500 mb-2">
                h5, .h5 - 25px / text-2xl
              </div>
              <h5 className="h5">The quick brown fox jumps over the lazy dog</h5>
            </div>
            <div>
              <div className="text-xs font-mono text-neutral-500 mb-2">
                h6, .h6 - 20px / text-xl
              </div>
              <h6 className="h6">The quick brown fox jumps over the lazy dog</h6>
            </div>
          </div>
        </div>

        {/* Display Sizes */}
        <div>
          <h3 className="text-2xl font-bold text-neutral-900 mb-6">Display Sizes (Hero Text)</h3>
          <div className="space-y-8 bg-white p-8 rounded-lg border border-neutral-200">
            <div>
              <div className="text-xs font-mono text-neutral-500 mb-3">
                .display-xl - 119.2px / text-9xl
              </div>
              <div className="display-xl">Hero XL</div>
            </div>
            <div>
              <div className="text-xs font-mono text-neutral-500 mb-3">
                .display-lg - 95.4px / text-8xl
              </div>
              <div className="display-lg">Hero Large</div>
            </div>
            <div>
              <div className="text-xs font-mono text-neutral-500 mb-3">
                .display-md - 76.3px / text-7xl
              </div>
              <div className="display-md">Hero Medium</div>
            </div>
          </div>
        </div>

        {/* Body Text Sizes */}
        <div>
          <h3 className="text-2xl font-bold text-neutral-900 mb-6">Body Text Sizes</h3>
          <div className="space-y-6 bg-white p-8 rounded-lg border border-neutral-200">
            <div>
              <div className="text-xs font-mono text-neutral-500 mb-2">
                .body-lg / text-lg - 18px
              </div>
              <p className="body-lg">The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.</p>
            </div>
            <div>
              <div className="text-xs font-mono text-neutral-500 mb-2">
                .body / text-base - 16px (default)
              </div>
              <p className="body">The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.</p>
            </div>
            <div>
              <div className="text-xs font-mono text-neutral-500 mb-2">
                .body-sm / text-sm - 14px
              </div>
              <p className="body-sm">The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.</p>
            </div>
            <div>
              <div className="text-xs font-mono text-neutral-500 mb-2">
                .body-xs / text-xs - 12px
              </div>
              <p className="body-xs">The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.</p>
            </div>
          </div>
        </div>

        {/* Font Weights */}
        <div>
          <h3 className="text-2xl font-bold text-neutral-900 mb-6">Font Weights</h3>
          <div className="space-y-4 bg-white p-8 rounded-lg border border-neutral-200">
            <p className="text-lg font-normal">Normal (400): The quick brown fox jumps over the lazy dog</p>
            <p className="text-lg font-medium">Medium (500): The quick brown fox jumps over the lazy dog</p>
            <p className="text-lg font-semibold">Semibold (600): The quick brown fox jumps over the lazy dog</p>
            <p className="text-lg font-bold">Bold (700): The quick brown fox jumps over the lazy dog</p>
          </div>
        </div>

        {/* Text Colors */}
        <div>
          <h3 className="text-2xl font-bold text-neutral-900 mb-6">Text Color Utilities</h3>
          <div className="space-y-3 bg-white p-8 rounded-lg border border-neutral-200">
            <p className="text-neutral-900">Default (.text-neutral-900)</p>
            <p className="text-neutral-700">Body text (.text-neutral-700)</p>
            <p className="text-muted">Muted text (.text-muted)</p>
            <p className="text-subtle">Subtle text (.text-subtle)</p>
            <p className="text-emphasis">Emphasis text (.text-emphasis)</p>
            <p className="text-brand">Brand text (.text-brand)</p>
            <p className="text-success">Success text (.text-success)</p>
            <p className="text-warning">Warning text (.text-warning)</p>
            <p className="text-error">Error text (.text-error)</p>
            <p className="text-info">Info text (.text-info)</p>
          </div>
        </div>

        {/* Component Examples */}
        <div>
          <h3 className="text-2xl font-bold text-neutral-900 mb-6">Typography Components</h3>
          <div className="space-y-6 bg-white p-8 rounded-lg border border-neutral-200">
            <div>
              <div className="text-xs font-mono text-neutral-500 mb-3">
                {'<Heading level={2}>'}
              </div>
              <h2 className="h2">Using Heading Component</h2>
            </div>
            <div>
              <div className="text-xs font-mono text-neutral-500 mb-3">
                {'<Text variant="body-lg">'}
              </div>
              <p className="body-lg">Using Text component with body-lg variant for emphasized paragraphs.</p>
            </div>
            <div>
              <div className="text-xs font-mono text-neutral-500 mb-3">
                {'<Display size="md">'}
              </div>
              <div className="display-md">Display Hero Text</div>
            </div>
          </div>
        </div>
      </div>
    )
  },
  components: {
    title: 'Components',
    component: (
      <div className="space-y-16">
        {/* Buttons */}
        <div>
          <h3 className="h3 mb-6">Buttons</h3>

          {/* Button Variants */}
          <div className="mb-8">
            <h4 className="text-lg font-semibold text-neutral-700 mb-4">Variants</h4>
            <div className="flex flex-wrap gap-3 bg-white p-6 rounded-lg border border-neutral-200">
              <Button variant="default">Default</Button>
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
              <Button variant="success">Success</Button>
              <Button variant="warning">Warning</Button>
              <Button variant="destructive">Destructive</Button>
            </div>
          </div>

          {/* Button Sizes */}
          <div className="mb-8">
            <h4 className="text-lg font-semibold text-neutral-700 mb-4">Sizes</h4>
            <div className="flex flex-wrap items-center gap-3 bg-white p-6 rounded-lg border border-neutral-200">
              <Button size="xs">Extra Small</Button>
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
              <Button size="xl">Extra Large</Button>
            </div>
          </div>

          {/* Button States */}
          <div>
            <h4 className="text-lg font-semibold text-neutral-700 mb-4">States</h4>
            <div className="flex flex-wrap gap-3 bg-white p-6 rounded-lg border border-neutral-200">
              <Button>Normal</Button>
              <Button loading>Loading</Button>
              <Button disabled>Disabled</Button>
            </div>
          </div>
        </div>

        {/* Form Inputs */}
        <div>
          <h3 className="h3 mb-6">Form Components</h3>
          <div className="space-y-6 bg-white p-6 rounded-lg border border-neutral-200 max-w-2xl">
            <Input
              label="Name"
              placeholder="Enter your name"
              helperText="This is a helper text"
            />
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              required
            />
            <Input
              label="With Error"
              placeholder="Enter value"
              errorMessage="This field is required"
            />
            <Textarea
              label="Description"
              placeholder="Tell us more..."
              maxLength={200}
              showCharCount
              helperText="Share your thoughts"
            />
          </div>
        </div>

        {/* Badges */}
        <div>
          <h3 className="h3 mb-6">Badges</h3>
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-semibold text-neutral-700 mb-4">Variants</h4>
              <div className="flex flex-wrap gap-3 bg-white p-6 rounded-lg border border-neutral-200">
                <Badge variant="default">Default</Badge>
                <Badge variant="primary">Primary</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="success">Success</Badge>
                <Badge variant="warning">Warning</Badge>
                <Badge variant="error">Error</Badge>
                <Badge variant="info">Info</Badge>
              </div>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-neutral-700 mb-4">With Dot & Outline</h4>
              <div className="flex flex-wrap gap-3 bg-white p-6 rounded-lg border border-neutral-200">
                <Badge variant="success" dot>Active</Badge>
                <Badge variant="warning" dot>Pending</Badge>
                <Badge variant="primary" outline>Featured</Badge>
                <Badge variant="secondary" outline>Draft</Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Alerts */}
        <div>
          <h3 className="h3 mb-6">Alerts</h3>
          <div className="space-y-4 max-w-3xl">
            <Alert variant="info" title="Information">
              This is an informational message that provides helpful context.
            </Alert>
            <Alert variant="success" title="Success">
              Your update was shared successfully with your family!
            </Alert>
            <Alert variant="warning" title="Warning">
              Please review your changes before submitting.
            </Alert>
            <Alert variant="error" title="Error">
              Something went wrong. Please try again.
            </Alert>
          </div>
        </div>

        {/* Cards */}
        <div>
          <h3 className="h3 mb-6">Cards</h3>
          <Grid cols={2} responsive={{ sm: 1 }} gap="lg" className="max-w-4xl">
            <GridItem>
              <Card>
                <CardHeader>
                  <CardTitle>Basic Card</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-neutral-600">A simple card with header and content.</p>
                </CardContent>
              </Card>
            </GridItem>
            <GridItem>
              <Card hover>
                <CardHeader>
                  <CardTitle>Hoverable Card</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-neutral-600">This card has a hover effect.</p>
                </CardContent>
              </Card>
            </GridItem>
            <GridItem>
              <Card padding="lg" className="bg-gradient-to-br from-primary-50 to-primary-100">
                <CardHeader>
                  <CardTitle>Featured Card</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-neutral-700">A card with custom styling and larger padding.</p>
                </CardContent>
              </Card>
            </GridItem>
            <GridItem>
              <Card interactive>
                <CardHeader>
                  <CardTitle>Interactive Card</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-neutral-600">This card is clickable and interactive.</p>
                </CardContent>
              </Card>
            </GridItem>
          </Grid>
        </div>
      </div>
    )
  },
  examples: {
    title: 'Example Implementations',
    component: (
      <div className="space-y-16">
        <div>
          <h2 className="h2 mb-6">Baby Update Card</h2>
          <div className="flex justify-center">
            <BabyUpdateCard />
          </div>
        </div>

        <div>
          <h2 className="h2 mb-6">Create Update Form</h2>
          <CreateUpdateForm />
        </div>

        <div>
          <h2 className="h2 mb-6">Layout Showcase</h2>
          <LayoutShowcase />
        </div>
      </div>
    )
  }
} satisfies Record<string, { title: string; component: React.ReactNode }>

export const StyleGuide: React.FC<StyleGuideProps> = ({ section = 'all' }) => {
  const renderSection = (key: keyof typeof SECTIONS) => {
    const sectionData = SECTIONS[key]
    if (!sectionData) return null

    return (
      <section key={key} className="mb-16">
        <Container>
          <h1 className="h1 mb-8 text-center">{sectionData.title}</h1>
          {sectionData.component}
        </Container>
      </section>
    )
  }

  const renderAll = () => {
    return (Object.keys(SECTIONS) as Array<keyof typeof SECTIONS>).map(renderSection)
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-16">
      {/* Header */}
      <Container className="mb-16">
        <div className="text-center">
          <h1 className="display-lg mb-4 gradient-primary bg-clip-text text-transparent">
            Tribe Design System
          </h1>
          <p className="body-lg text-neutral-600 max-w-2xl mx-auto">
            A comprehensive, family-friendly design system built for the Tribe MVP platform.
            Featuring warm colors, accessibility-first components, and consistent design patterns.
          </p>
        </div>
      </Container>

      {/* Navigation */}
      <Container className="mb-12">
        <div className="flex justify-center">
          <nav className="flex flex-wrap justify-center gap-2 sm:gap-4 p-2 bg-white rounded-lg shadow-sm border border-neutral-200">
            {['all', 'colors', 'typography', 'components', 'examples'].map((tab) => (
              <span
                key={tab}
                className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors capitalize ${
                  section === tab
                    ? 'bg-primary-500 text-white'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                }`}
              >
                {tab}
              </span>
            ))}
          </nav>
        </div>
      </Container>

      {/* Content */}
      {section === 'all' ? renderAll() : renderSection(section as keyof typeof SECTIONS)}

      {/* Footer */}
      <Container>
        <div className="text-center py-12 border-t border-neutral-200">
          <p className="text-sm text-neutral-500">
            Built with Next.js, TypeScript, Tailwind CSS, and lots of care
          </p>
        </div>
      </Container>
    </div>
  )
}

export default StyleGuide
