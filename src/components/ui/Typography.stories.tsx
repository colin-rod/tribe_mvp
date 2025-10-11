import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Heading, Text, Display, LinkText, Code } from './Typography'

const meta = {
  title: 'UI/Typography',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Typography system components for consistent text styling across the application. Includes headings, body text, display text, links, and code snippets.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

// Headings
export const Headings: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <Heading level={1}>Heading 1</Heading>
        <p className="text-sm text-gray-500 mt-1">Font size: 3rem (48px), Weight: 700</p>
      </div>
      <div>
        <Heading level={2}>Heading 2</Heading>
        <p className="text-sm text-gray-500 mt-1">Font size: 2.25rem (36px), Weight: 700</p>
      </div>
      <div>
        <Heading level={3}>Heading 3</Heading>
        <p className="text-sm text-gray-500 mt-1">Font size: 1.875rem (30px), Weight: 600</p>
      </div>
      <div>
        <Heading level={4}>Heading 4</Heading>
        <p className="text-sm text-gray-500 mt-1">Font size: 1.5rem (24px), Weight: 600</p>
      </div>
      <div>
        <Heading level={5}>Heading 5</Heading>
        <p className="text-sm text-gray-500 mt-1">Font size: 1.25rem (20px), Weight: 600</p>
      </div>
      <div>
        <Heading level={6}>Heading 6</Heading>
        <p className="text-sm text-gray-500 mt-1">Font size: 1rem (16px), Weight: 600</p>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'All heading levels (h1-h6) with their default styles.',
      },
    },
  },
}

// Semantic vs Visual Hierarchy
export const SemanticVsVisual: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-500 mb-2">Semantic h3, styled as h1:</p>
        <Heading level={3} styleAs={1}>
          This is an h3 element that looks like h1
        </Heading>
        <p className="text-sm text-gray-600 mt-2">
          Use <code>styleAs</code> prop when semantic meaning differs from visual hierarchy
        </p>
      </div>
      <div>
        <p className="text-sm text-gray-500 mb-2">Semantic h2, styled as h4:</p>
        <Heading level={2} styleAs={4}>
          This is an h2 element that looks like h4
        </Heading>
        <p className="text-sm text-gray-600 mt-2">
          Useful for maintaining proper document outline while achieving desired visual design
        </p>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Decouple semantic meaning from visual appearance using the `styleAs` prop.',
      },
    },
  },
}

// Body Text Variants
export const BodyText: Story = {
  render: () => (
    <div className="space-y-6 max-w-2xl">
      <div>
        <p className="text-sm font-medium text-gray-500 mb-2">Body Large</p>
        <Text variant="body-lg">
          This is large body text. Great for introductions or emphasized paragraphs that need more visual prominence.
        </Text>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500 mb-2">Body (Default)</p>
        <Text variant="body">
          This is the default body text. Use for main content, descriptions, and general text throughout the application.
          It provides optimal readability at 16px with 1.5 line height.
        </Text>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500 mb-2">Body Small</p>
        <Text variant="body-sm">
          This is small body text. Useful for secondary information, helper text, or less important content that still needs to be readable.
        </Text>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500 mb-2">Body Extra Small</p>
        <Text variant="body-xs">
          This is extra small body text. Use sparingly for metadata, timestamps, or tertiary information.
        </Text>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500 mb-2">Caption</p>
        <Text variant="caption">
          This is caption text. Often used for image captions, form helper text, or footnotes.
        </Text>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500 mb-2">Overline</p>
        <Text variant="overline">
          THIS IS OVERLINE TEXT
        </Text>
        <p className="text-xs text-gray-600 mt-1">Typically used for category labels or section markers</p>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Different body text size variants for various content hierarchies.',
      },
    },
  },
}

// Text Colors
export const TextColors: Story = {
  render: () => (
    <div className="space-y-3 max-w-2xl">
      <Text color="default">
        Default text color - Primary content and headings
      </Text>
      <Text color="muted">
        Muted text color - Secondary content and descriptions
      </Text>
      <Text color="subtle">
        Subtle text color - Tertiary content and helper text
      </Text>
      <Text color="emphasis">
        Emphasis text color - Highlighted or important content
      </Text>
      <Text color="brand">
        Brand text color - Brand-colored text and links
      </Text>
      <Text color="success">
        Success text color - Positive feedback and confirmations
      </Text>
      <Text color="warning">
        Warning text color - Caution messages and alerts
      </Text>
      <Text color="error">
        Error text color - Error messages and validation failures
      </Text>
      <Text color="info">
        Info text color - Informational messages and tips
      </Text>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Text color presets for different semantic meanings and hierarchies.',
      },
    },
  },
}

// Display Text
export const DisplayText: Story = {
  render: () => (
    <div className="space-y-8">
      <div>
        <Display size="xl">
          Extra Large Display
        </Display>
        <p className="text-sm text-gray-500 mt-2">Font size: 4.5rem (72px) - Hero sections</p>
      </div>
      <div>
        <Display size="lg">
          Large Display Text
        </Display>
        <p className="text-sm text-gray-500 mt-2">Font size: 3.75rem (60px) - Landing pages</p>
      </div>
      <div>
        <Display size="md">
          Medium Display Text
        </Display>
        <p className="text-sm text-gray-500 mt-2">Font size: 3rem (48px) - Section headers</p>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Extra large display text for hero sections and landing pages. Use sparingly.',
      },
    },
  },
}

// Links
export const Links: Story = {
  render: () => (
    <div className="space-y-4 max-w-2xl">
      <div>
        <p className="text-sm font-medium text-gray-500 mb-2">Default Link</p>
        <Text variant="body">
          This paragraph contains a <LinkText href="#">default link</LinkText> with underline and hover effects.
          Links should have clear, descriptive text.
        </Text>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500 mb-2">Subtle Link</p>
        <Text variant="body">
          This paragraph contains a <LinkText href="#" variant="subtle">subtle link</LinkText> without underline.
          Use for less prominent navigation links.
        </Text>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500 mb-2">Standalone Links</p>
        <div className="space-y-2">
          <div>
            <LinkText href="#">Learn more about Tribe MVP</LinkText>
          </div>
          <div>
            <LinkText href="#" variant="subtle">View all memories →</LinkText>
          </div>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Link text variants with proper styling and hover states.',
      },
    },
  },
}

// Code
export const CodeText: Story = {
  render: () => (
    <div className="space-y-6 max-w-2xl">
      <div>
        <p className="text-sm font-medium text-gray-500 mb-2">Inline Code</p>
        <Text variant="body">
          Use the <Code>npm install</Code> command to install dependencies. You can also run <Code>npm test</Code> to execute tests.
        </Text>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500 mb-2">Code Block</p>
        <Code block className="p-4 bg-gray-100 rounded-md overflow-x-auto text-sm">
{`function greet(name: string) {
  return \`Hello, \${name}!\`
}

console.log(greet('World'))`}
        </Code>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Inline code and code blocks for technical content.',
      },
    },
  },
}

// Real-World Example
export const RealWorldExample: Story = {
  render: () => (
    <article className="max-w-2xl space-y-6">
      <header>
        <Text variant="overline" color="brand">
          PARENTING TIPS
        </Text>
        <Heading level={1} className="mt-2">
          Capturing Your Baby&apos;s First Year
        </Heading>
        <Text variant="body-sm" color="muted" className="mt-2">
          Posted on January 15, 2025 by Sarah Johnson
        </Text>
      </header>

      <div className="space-y-4">
        <Text variant="body-lg">
          The first year of your baby&apos;s life is filled with incredible milestones and precious moments.
          Here&apos;s how to document these memories effectively.
        </Text>

        <div className="space-y-3">
          <Heading level={2}>Why Documentation Matters</Heading>
          <Text variant="body">
            Every smile, every giggle, every tiny achievement deserves to be remembered. Creating a visual
            timeline helps you appreciate the incredible journey of growth and development.
          </Text>
        </div>

        <div className="space-y-3">
          <Heading level={3}>Getting Started</Heading>
          <Text variant="body">
            Start by creating a dedicated space for your memories. With <LinkText href="#">Tribe MVP</LinkText>,
            you can easily share these moments with family while keeping everything organized and secure.
          </Text>
          <Text variant="body-sm" color="muted">
            Tip: Try to capture both the planned moments and the spontaneous ones—often the unplanned photos
            are the most precious.
          </Text>
        </div>

        <div className="bg-primary-50 p-4 rounded-lg border-l-4 border-primary-500">
          <Text variant="body" color="emphasis">
            &ldquo;The days are long, but the years are short. Document everything you can!&rdquo;
          </Text>
          <Text variant="caption" color="muted" className="mt-1">
            — Emily Chen, mother of two
          </Text>
        </div>
      </div>
    </article>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Real-world example showing typography components working together in an article layout.',
      },
    },
  },
}

// Responsive Typography
export const ResponsiveTypography: Story = {
  render: () => (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium text-gray-500 mb-3">Responsive Heading (resize browser to see effect)</p>
        <Heading level={1} responsive>
          This heading scales based on viewport size
        </Heading>
        <Text variant="body-sm" color="muted" className="mt-2">
          Uses the <code>responsive</code> prop to enable fluid typography
        </Text>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500 mb-3">Responsive Body Text</p>
        <Text variant="body" responsive>
          This text also responds to viewport size changes, maintaining optimal readability
          across different screen sizes from mobile to desktop.
        </Text>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Enable responsive typography that scales fluidly with viewport size.',
      },
    },
  },
}
