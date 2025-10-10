'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  TrashIcon,
  PencilSquareIcon,
  SparklesIcon,
  ChevronUpIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'
import type { UpdateInDigest as UpdateInDigestType } from '@/lib/types/digest'

interface MemoryInSummaryProps {
  update: UpdateInDigestType
  index: number
  totalUpdates: number
  onRemove: () => void
  onReorder: (newIndex: number) => void
  onEditCaption: (newCaption: string) => void
}

export default function MemoryInSummary({
  update,
  index,
  totalUpdates,
  onRemove,
  onReorder,
  onEditCaption
}: MemoryInSummaryProps) {
  const [isEditingCaption, setIsEditingCaption] = useState(false)
  const [editedCaption, setEditedCaption] = useState(update.custom_caption || update.content)
  const [showAIRationale, setShowAIRationale] = useState(false)

  const handleSaveCaption = () => {
    onEditCaption(editedCaption)
    setIsEditingCaption(false)
  }

  const handleCancelEdit = () => {
    setEditedCaption(update.custom_caption || update.content)
    setIsEditingCaption(false)
  }

  const canMoveUp = index > 0
  const canMoveDown = index < totalUpdates - 1

  return (
    <Card className="overflow-hidden">
      <div className="p-4">
        {/* Header with controls */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            {/* Order controls */}
            <div className="flex flex-col space-y-1">
              <button
                onClick={() => onReorder(index - 1)}
                disabled={!canMoveUp}
                className="p-1 rounded hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Move up"
              >
                <ChevronUpIcon className="w-4 h-4 text-neutral-600" />
              </button>
              <button
                onClick={() => onReorder(index + 1)}
                disabled={!canMoveDown}
                className="p-1 rounded hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Move down"
              >
                <ChevronDownIcon className="w-4 h-4 text-neutral-600" />
              </button>
            </div>

            <span className="text-sm font-medium text-neutral-500">
              #{index + 1}
            </span>

            {update.milestone_type && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                🎉 Milestone
              </span>
            )}

            {update.custom_caption && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                Customized
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsEditingCaption(!isEditingCaption)}
              className="p-2 rounded hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900 transition-colors"
              title="Edit caption"
            >
              <PencilSquareIcon className="w-5 h-5" />
            </button>

            <button
              onClick={onRemove}
              className="p-2 rounded hover:bg-red-50 text-red-600 hover:text-red-700 transition-colors"
              title="Remove from summary"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Child info */}
        <div className="mb-3">
          <div className="flex items-center space-x-2 text-sm text-neutral-600">
            <span className="font-medium text-neutral-900">{update.child_name}</span>
            <span>•</span>
            <span>{update.child_age}</span>
            <span>•</span>
            <span className="text-xs text-neutral-500">
              {new Date(update.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Content / Caption */}
        {isEditingCaption ? (
          <div className="mb-3">
            <textarea
              value={editedCaption}
              onChange={(e) => setEditedCaption(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              placeholder="Edit caption..."
            />
            <div className="mt-2 flex items-center justify-end space-x-2">
              <Button onClick={handleCancelEdit} variant="ghost" size="sm">
                Cancel
              </Button>
              <Button onClick={handleSaveCaption} variant="primary" size="sm">
                Save Caption
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-neutral-700 mb-3 leading-relaxed">
            {update.custom_caption || update.content}
          </p>
        )}

        {/* Media preview */}
        {update.media_urls && update.media_urls.length > 0 && (
          <div className="mb-3 flex space-x-2 overflow-x-auto">
            {update.media_urls.slice(0, 3).map((url, idx) => (
              <div
                key={idx}
                className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-100"
              >
                <Image
                  src={url}
                  alt={`Media ${idx + 1}`}
                  fill
                  className="object-cover"
                />
              </div>
            ))}
            {update.media_urls.length > 3 && (
              <div className="w-24 h-24 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0">
                <span className="text-xs text-neutral-600">
                  +{update.media_urls.length - 3} more
                </span>
              </div>
            )}
          </div>
        )}

        {/* AI Rationale */}
        {update.ai_rationale && (
          <div className="border-t border-neutral-200 pt-3">
            <button
              onClick={() => setShowAIRationale(!showAIRationale)}
              className="flex items-center space-x-2 text-xs text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              <SparklesIcon className="w-4 h-4 text-orange-500" />
              <span>
                {showAIRationale ? 'Hide' : 'Show'} AI reasoning
              </span>
            </button>

            {showAIRationale && update.ai_rationale.reasoning && (
              <div className="mt-2 p-3 bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg border border-orange-100">
                <p className="text-xs text-neutral-700">
                  {update.ai_rationale.reasoning}
                </p>
                {update.ai_rationale.importance_match !== undefined && (
                  <div className="mt-2 flex items-center space-x-2">
                    <span className="text-xs text-neutral-600">Relevance:</span>
                    <div className="flex-1 h-2 bg-neutral-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-orange-400 to-amber-400 rounded-full"
                        style={{ width: `${update.ai_rationale.importance_match * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-neutral-700">
                      {Math.round(update.ai_rationale.importance_match * 100)}%
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}