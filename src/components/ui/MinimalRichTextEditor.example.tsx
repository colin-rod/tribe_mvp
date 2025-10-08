'use client'

import { useState } from 'react'
import MinimalRichTextEditor from './MinimalRichTextEditor'

/**
 * Example Usage of MinimalRichTextEditor
 *
 * This component demonstrates how to use the MinimalRichTextEditor
 * as specified in Linear issue CRO-203.
 */
export default function MinimalRichTextEditorExample() {
  const [milestoneContent, setMilestoneContent] = useState(
    '<h1>First Steps</h1><p>Describe this exciting milestone...</p>'
  )

  const [updateContent, setUpdateContent] = useState('')

  return (
    <div className="space-y-8 p-8 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold mb-4">Minimal Rich Text Editor Demo</h2>
        <p className="text-gray-600 mb-6">
          This editor features a <strong>distraction-free interface</strong> with a toolbar that
          appears only when you hover over or focus on the editor. Perfect for capturing baby
          milestones and updates without UI clutter.
        </p>
      </div>

      {/* Example 1: Milestone Description */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Example 1: Milestone Title & Description</h3>
        <p className="text-sm text-gray-600 mb-3">
          Use headings for milestone names like &quot;First Steps&quot; or &quot;First Words&quot;
        </p>
        <MinimalRichTextEditor
          content={milestoneContent}
          onChange={setMilestoneContent}
          placeholder="Describe this milestone..."
          maxCharacters={1000}
        />
        <div className="mt-4 p-4 bg-gray-50 rounded">
          <h4 className="text-sm font-semibold mb-2">Preview:</h4>
          <div
            className="prose prose-sm"
            dangerouslySetInnerHTML={{ __html: milestoneContent }}
          />
        </div>
      </div>

      {/* Example 2: Daily Update */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Example 2: Quick Daily Update</h3>
        <p className="text-sm text-gray-600 mb-3">
          Hover over the editor to see the toolbar appear
        </p>
        <MinimalRichTextEditor
          content={updateContent}
          onChange={setUpdateContent}
          placeholder="What happened today? Try adding emojis with your device's emoji picker! 😊"
          maxCharacters={2000}
          toolbarPosition="bottom"
        />
      </div>

      {/* Feature List */}
      <div className="bg-blue-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">✨ Features (CRO-203 Requirements)</h3>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start">
            <span className="mr-2">✓</span>
            <span><strong>Bold/Italic:</strong> Use Ctrl+B and Ctrl+I or toolbar buttons</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">✓</span>
            <span><strong>Lists:</strong> Create bullet points and numbered lists</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">✓</span>
            <span><strong>Inline Emoji:</strong> Use your device&apos;s emoji picker (Win+. or Cmd+Ctrl+Space)</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">✓</span>
            <span><strong>Headings:</strong> H1, H2, H3 for milestone titles</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">✓</span>
            <span><strong>Hidden Toolbar:</strong> Appears only on hover/focus to avoid clutter</span>
          </li>
        </ul>
      </div>

      {/* Usage Tips */}
      <div className="bg-green-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">💡 Usage Tips</h3>
        <ul className="space-y-2 text-sm">
          <li>• The toolbar is hidden by default to keep the interface clean</li>
          <li>• Hover over the editor or click inside to reveal formatting options</li>
          <li>• Use keyboard shortcuts for faster formatting (Ctrl+B for bold, Ctrl+I for italic)</li>
          <li>• Add emojis using your operating system&apos;s native emoji picker</li>
          <li>• Character count appears in the bottom right corner</li>
          <li>• Perfect for milestone descriptions and baby update content</li>
        </ul>
      </div>
    </div>
  )
}
