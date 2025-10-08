'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface MinimalRichTextEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
  disabled?: boolean
  maxCharacters?: number
  className?: string
  /** Optional: Show character count */
  showCharacterCount?: boolean
  /** Optional: Custom toolbar position */
  toolbarPosition?: 'top' | 'bottom'
}

/**
 * MinimalRichTextEditor - A distraction-free rich text editor with hidden toolbar
 *
 * Features (per CRO-203):
 * - Bold/italic formatting
 * - Bullets/numbered lists
 * - Inline emoji support (native browser emoji picker)
 * - Headings (for milestone titles like "First Steps")
 * - Toolbar hidden by default, shows on hover/focus
 *
 * Implementation based on Linear issue CRO-203
 */
export default function MinimalRichTextEditor({
  content,
  onChange,
  placeholder = "Start typing...",
  disabled = false,
  maxCharacters = 2000,
  className,
  showCharacterCount = true,
  toolbarPosition = 'top'
}: MinimalRichTextEditorProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      }),
      Placeholder.configure({
        placeholder
      })
    ],
    content,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      const text = editor.getText()

      // Enforce character limit
      if (text.length <= maxCharacters) {
        onChange(html)
      } else {
        // Revert to previous content if limit exceeded
        editor.commands.setContent(content)
      }
    },
    onFocus: () => setIsFocused(true),
    onBlur: () => setIsFocused(false),
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[120px] px-4 py-3'
      }
    }
  })

  // Sync external content changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  // Update editability when disabled prop changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled)
    }
  }, [disabled, editor])

  if (!editor) {
    return null
  }

  const characterCount = editor.getText().length
  const showToolbar = isFocused || isHovered

  const toolbarContent = (
    <div
      className={cn(
        'transition-all duration-200 ease-in-out overflow-hidden',
        showToolbar ? 'opacity-100 max-h-16' : 'opacity-0 max-h-0'
      )}
    >
      <div className="bg-gray-50 px-3 py-2 flex flex-wrap items-center gap-1 border-b border-gray-200">
        {/* Text Formatting */}
        <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={disabled || !editor.can().chain().focus().toggleBold().run()}
            className={cn(
              'p-2 rounded hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
              editor.isActive('bold') ? 'bg-gray-200 text-primary-600' : 'text-gray-700'
            )}
            title="Bold (Ctrl+B)"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6 4a1 1 0 011-1h3.5a4.5 4.5 0 013.256 7.606A5 5 0 0112.5 20H7a1 1 0 01-1-1V4zm2 11h4.5a3 3 0 100-6H8v6zm0-8h3.5a2.5 2.5 0 000-5H8v5z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={disabled || !editor.can().chain().focus().toggleItalic().run()}
            className={cn(
              'p-2 rounded hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
              editor.isActive('italic') ? 'bg-gray-200 text-primary-600' : 'text-gray-700'
            )}
            title="Italic (Ctrl+I)"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 5a1 1 0 011 1v8a1 1 0 11-2 0V6a1 1 0 011-1z" transform="skewX(-10)" />
            </svg>
          </button>
        </div>

        {/* Heading Levels */}
        <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            disabled={disabled}
            className={cn(
              'px-2 py-1 rounded text-sm font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
              editor.isActive('heading', { level: 1 }) ? 'bg-gray-200 text-primary-600' : 'text-gray-700'
            )}
            title="Heading 1"
          >
            H1
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            disabled={disabled}
            className={cn(
              'px-2 py-1 rounded text-sm font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
              editor.isActive('heading', { level: 2 }) ? 'bg-gray-200 text-primary-600' : 'text-gray-700'
            )}
            title="Heading 2"
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            disabled={disabled}
            className={cn(
              'px-2 py-1 rounded text-sm font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
              editor.isActive('heading', { level: 3 }) ? 'bg-gray-200 text-primary-600' : 'text-gray-700'
            )}
            title="Heading 3"
          >
            H3
          </button>
        </div>

        {/* Lists */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            disabled={disabled}
            className={cn(
              'p-2 rounded hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
              editor.isActive('bulletList') ? 'bg-gray-200 text-primary-600' : 'text-gray-700'
            )}
            title="Bullet List"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            disabled={disabled}
            className={cn(
              'p-2 rounded hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
              editor.isActive('orderedList') ? 'bg-gray-200 text-primary-600' : 'text-gray-700'
            )}
            title="Numbered List"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
            </svg>
          </button>
        </div>

        <div className="flex-1" />

        {/* Helper text */}
        <div className="text-xs text-gray-500 italic">
          Use your device&apos;s emoji picker for emojis
        </div>
      </div>
    </div>
  )

  return (
    <div
      className={cn(
        'border-2 border-gray-300 rounded-lg bg-white overflow-hidden transition-all duration-200',
        isFocused && 'border-primary-500 ring-2 ring-primary-200',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Toolbar at top */}
      {toolbarPosition === 'top' && toolbarContent}

      {/* Editor Content */}
      <div className="relative">
        <EditorContent editor={editor} />

        {/* Character Count */}
        {showCharacterCount && (
          <div className="absolute bottom-3 right-3 text-xs text-gray-500 bg-white/90 px-2 py-1 rounded shadow-sm">
            <span className={characterCount > maxCharacters ? 'text-red-600 font-semibold' : ''}>
              {characterCount}
            </span>
            /{maxCharacters}
          </div>
        )}
      </div>

      {/* Toolbar at bottom */}
      {toolbarPosition === 'bottom' && toolbarContent}
    </div>
  )
}
