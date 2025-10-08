import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'
import MinimalRichTextEditor from './MinimalRichTextEditor'

const meta: Meta<typeof MinimalRichTextEditor> = {
  title: 'UI/MinimalRichTextEditor',
  component: MinimalRichTextEditor,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
A distraction-free rich text editor with a toolbar that's hidden by default.

**Features (CRO-203):**
- Bold/italic formatting
- Bullets/numbered lists
- Inline emoji support (use your device's native emoji picker)
- Headings (H1, H2, H3) for milestone titles
- Toolbar hidden by default, shows on hover/focus to avoid clutter
- Character count display
- Maximum character limit enforcement

**Usage Tips:**
- Hover over or click into the editor to reveal the toolbar
- Use keyboard shortcuts: Ctrl+B (bold), Ctrl+I (italic)
- Use your operating system's emoji picker (Windows: Win+., Mac: Cmd+Ctrl+Space)
- Great for milestone descriptions, update content, and formatted notes
        `
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    content: {
      control: 'text',
      description: 'HTML content of the editor'
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text when editor is empty'
    },
    disabled: {
      control: 'boolean',
      description: 'Disable the editor'
    },
    maxCharacters: {
      control: 'number',
      description: 'Maximum number of characters allowed'
    },
    showCharacterCount: {
      control: 'boolean',
      description: 'Show/hide character count'
    },
    toolbarPosition: {
      control: 'radio',
      options: ['top', 'bottom'],
      description: 'Position of the toolbar'
    }
  }
}

export default meta
type Story = StoryObj<typeof MinimalRichTextEditor>

// Wrapper component to handle state
function EditorWrapper(args: React.ComponentProps<typeof MinimalRichTextEditor>) {
  const [content, setContent] = useState(args.content)

  return (
    <div>
      <MinimalRichTextEditor
        {...args}
        content={content}
        onChange={setContent}
      />

      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-semibold mb-2">Current HTML Output:</h3>
        <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-48">
          {content}
        </pre>
      </div>
    </div>
  )
}

export const Default: Story = {
  args: {
    content: '<p>Try hovering over this text or clicking to reveal the toolbar!</p>',
    placeholder: 'Start typing...',
    maxCharacters: 2000,
    showCharacterCount: true,
    toolbarPosition: 'top'
  },
  render: (args) => <EditorWrapper {...args} />
}

export const Empty: Story = {
  args: {
    content: '',
    placeholder: 'Describe your baby\'s first steps...',
    maxCharacters: 2000,
    showCharacterCount: true,
    toolbarPosition: 'top'
  },
  render: (args) => <EditorWrapper {...args} />
}

export const WithMilestoneContent: Story = {
  args: {
    content: '<h1>First Steps 🎉</h1><p>Today was <strong>amazing</strong>! Our little one took their first independent steps!</p><ul><li>3 steps on their own</li><li>Big smile the whole time</li><li>So proud! 😍</li></ul>',
    placeholder: 'Describe this milestone...',
    maxCharacters: 2000,
    showCharacterCount: true,
    toolbarPosition: 'top'
  },
  render: (args) => <EditorWrapper {...args} />
}

export const WithFormattedUpdate: Story = {
  args: {
    content: '<h2>Morning Routine</h2><p>Started the day with:</p><ol><li><strong>Breakfast</strong> - loved the oatmeal</li><li><strong>Playtime</strong> - new blocks are a hit</li><li><strong>Story time</strong> - "Brown Bear" again! 📚</li></ol>',
    placeholder: 'Share an update...',
    maxCharacters: 2000,
    showCharacterCount: true,
    toolbarPosition: 'top'
  },
  render: (args) => <EditorWrapper {...args} />
}

export const ToolbarBottom: Story = {
  args: {
    content: '<p>This editor has the toolbar positioned at the bottom. Hover or focus to see it!</p>',
    placeholder: 'Start typing...',
    maxCharacters: 2000,
    showCharacterCount: true,
    toolbarPosition: 'bottom'
  },
  render: (args) => <EditorWrapper {...args} />
}

export const WithCharacterLimit: Story = {
  args: {
    content: '<p>This editor has a very strict character limit of 200 characters. Try typing more!</p>',
    placeholder: 'Start typing...',
    maxCharacters: 200,
    showCharacterCount: true,
    toolbarPosition: 'top'
  },
  render: (args) => <EditorWrapper {...args} />
}

export const NoCharacterCount: Story = {
  args: {
    content: '<p>This editor hides the character count for a cleaner look.</p>',
    placeholder: 'Start typing...',
    maxCharacters: 2000,
    showCharacterCount: false,
    toolbarPosition: 'top'
  },
  render: (args) => <EditorWrapper {...args} />
}

export const Disabled: Story = {
  args: {
    content: '<h2>Read-Only Content</h2><p>This editor is <strong>disabled</strong> and cannot be edited.</p><ul><li>Feature one</li><li>Feature two</li></ul>',
    placeholder: 'Start typing...',
    disabled: true,
    maxCharacters: 2000,
    showCharacterCount: true,
    toolbarPosition: 'top'
  },
  render: (args) => <EditorWrapper {...args} />
}

export const CustomPlaceholder: Story = {
  args: {
    content: '',
    placeholder: 'Tell us about this special moment... 💝',
    maxCharacters: 2000,
    showCharacterCount: true,
    toolbarPosition: 'top'
  },
  render: (args) => <EditorWrapper {...args} />
}

export const WithAllFormattingOptions: Story = {
  args: {
    content: `
<h1>Main Heading</h1>
<h2>Subheading</h2>
<h3>Minor Heading</h3>
<p>This paragraph has <strong>bold text</strong> and <em>italic text</em>.</p>
<h3>Bullet List</h3>
<ul>
  <li>First item</li>
  <li>Second item</li>
  <li>Third item with <strong>formatting</strong></li>
</ul>
<h3>Numbered List</h3>
<ol>
  <li>Step one</li>
  <li>Step two</li>
  <li>Step three</li>
</ol>
<p>Add emojis directly: 🎉 😊 ❤️ 👶 🍼</p>
    `.trim(),
    placeholder: 'Start typing...',
    maxCharacters: 2000,
    showCharacterCount: true,
    toolbarPosition: 'top'
  },
  render: (args) => <EditorWrapper {...args} />
}

export const CompactSize: Story = {
  args: {
    content: '<p>Compact editor for quick notes</p>',
    placeholder: 'Quick note...',
    maxCharacters: 500,
    showCharacterCount: true,
    toolbarPosition: 'top',
    className: 'max-w-md'
  },
  render: (args) => <EditorWrapper {...args} />
}

export const FullWidth: Story = {
  args: {
    content: '<h2>Full Width Editor</h2><p>This editor spans the full width of its container, perfect for longer content.</p>',
    placeholder: 'Start typing...',
    maxCharacters: 5000,
    showCharacterCount: true,
    toolbarPosition: 'top',
    className: 'w-full'
  },
  render: (args) => <EditorWrapper {...args} />
}
