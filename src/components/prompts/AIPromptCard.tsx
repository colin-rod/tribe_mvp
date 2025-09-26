/**
 * AI Prompt Card Component - Template-Based System
 * Displays personalized prompts generated from curated templates with 90% cost reduction
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import {
  XMarkIcon,
  CameraIcon,
  DocumentTextIcon,
  SparklesIcon,
  UserGroupIcon,
  TrophyIcon,
  BoltIcon,
  FaceSmileIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { cn } from '@/lib/utils'
import { createLogger } from '@/lib/logger'

const logger = createLogger('AIPromptCard')

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

type PromptVariableValue = string | number | boolean | null

export interface AIPrompt {
  id: string
  prompt_text: string
  prompt_type: 'milestone' | 'activity' | 'fun' | 'seasonal'
  child_id: string
  child_name?: string
  template_id?: string
  substituted_variables?: Record<string, PromptVariableValue>
  created_at: string
  sent_at?: string
  status: 'pending' | 'sent' | 'acted_on' | 'dismissed'
  template?: {
    id: string
    is_community_contributed: boolean
    effectiveness_score?: number
    usage_count?: number
    created_by?: string
  }
}

interface AIPromptCardProps {
  prompt: AIPrompt
  onDismiss: (promptId: string) => Promise<void>
  onActOn: (promptId: string) => Promise<void>
  showTemplateAttribution?: boolean
  compact?: boolean
}

// =============================================================================
// PROMPT TYPE CONFIGURATIONS
// =============================================================================

const PROMPT_CONFIG = {
  milestone: {
    icon: TrophyIcon,
    color: 'border-purple-200 bg-purple-50',
    textColor: 'text-purple-900',
    badgeColor: 'bg-purple-100 text-purple-700',
    label: 'Milestone'
  },
  activity: {
    icon: BoltIcon,
    color: 'border-blue-200 bg-blue-50',
    textColor: 'text-blue-900',
    badgeColor: 'bg-blue-100 text-blue-700',
    label: 'Activity'
  },
  fun: {
    icon: FaceSmileIcon,
    color: 'border-yellow-200 bg-yellow-50',
    textColor: 'text-yellow-900',
    badgeColor: 'bg-yellow-100 text-yellow-700',
    label: 'Fun'
  },
  seasonal: {
    icon: SparklesIcon,
    color: 'border-green-200 bg-green-50',
    textColor: 'text-green-900',
    badgeColor: 'bg-green-100 text-green-700',
    label: 'Seasonal'
  }
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function AIPromptCard({
  prompt,
  onDismiss,
  onActOn,
  showTemplateAttribution = true,
  compact = false
}: AIPromptCardProps) {
  const [isActing, setIsActing] = useState(false)
  const [isDismissing, setIsDismissing] = useState(false)
  const router = useRouter()

  const config = PROMPT_CONFIG[prompt.prompt_type]
  const isLoading = isActing || isDismissing

  // =============================================================================
  // EVENT HANDLERS
  // =============================================================================

  const handleCreateUpdate = async () => {
    if (isLoading) return

    setIsActing(true)
    try {
      await onActOn(prompt.id)

      // Navigate to create update page with prompt context
      const params = new URLSearchParams({
        child: prompt.child_id,
        prompt: prompt.id,
        type: prompt.prompt_type
      })

      router.push(`/dashboard/create-update?${params.toString()}`)
    } catch (error) {
      logger.error('Failed to act on prompt', { error, promptId: prompt.id })
    } finally {
      setIsActing(false)
    }
  }

  const handleDismiss = async () => {
    if (isLoading) return

    setIsDismissing(true)
    try {
      await onDismiss(prompt.id)
    } catch (error) {
      logger.error('Failed to dismiss prompt', { error, promptId: prompt.id })
    } finally {
      setIsDismissing(false)
    }
  }

  // =============================================================================
  // RENDER HELPERS
  // =============================================================================

  const renderPromptHeader = () => {
    const HeaderIcon = config.icon

    return (
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-1">
          <HeaderIcon className={`h-5 w-5 ${config.textColor}`} aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-medium text-gray-900 capitalize">
              {config.label} suggestion
            </h3>

            {/* Community Template Badge */}
            {prompt.template?.is_community_contributed && showTemplateAttribution && (
              <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                <UserGroupIcon className="h-3 w-3" />
                Community
              </span>
            )}

            {/* Template Effectiveness Badge */}
            {prompt.template?.effectiveness_score && prompt.template.effectiveness_score > 8 && (
              <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                <SparklesIcon className="h-3 w-3" />
                Popular
              </span>
            )}
          </div>

          <p className="text-xs text-gray-500 mt-1">
            {prompt.child_name && `For ${prompt.child_name} • `}
            {formatDistanceToNow(new Date(prompt.created_at), { addSuffix: true })}
            {prompt.template_id && !compact && (
              <span className="ml-1 text-gray-400">
                • Template-based
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Dismiss Button */}
      <button
        onClick={handleDismiss}
        disabled={isLoading}
        className={cn(
          'p-1 text-gray-400 hover:text-gray-600 rounded-md transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-gray-300',
          isLoading && 'opacity-50 cursor-not-allowed'
        )}
        aria-label="Dismiss prompt"
      >
        {isDismissing ? (
          <LoadingSpinner size="sm" />
        ) : (
          <XMarkIcon className="h-4 w-4" />
        )}
      </button>
      </div>
    )
  }

  const renderPromptContent = () => (
    <div className={cn('mb-4', compact && 'mb-3')}>
      <p className={cn(
        'text-gray-800 leading-relaxed',
        compact ? 'text-sm' : 'text-base'
      )}>
        {prompt.prompt_text}
      </p>

      {/* Variable Substitution Info (Debug/Dev Mode) */}
      {process.env.NODE_ENV === 'development' &&
       prompt.substituted_variables &&
       Object.keys(prompt.substituted_variables).length > 0 && (
        <details className="mt-2">
          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
            Template variables ({Object.keys(prompt.substituted_variables).length})
          </summary>
          <pre className="text-xs text-gray-600 mt-1 p-2 bg-gray-50 rounded border overflow-x-auto">
            {JSON.stringify(prompt.substituted_variables, null, 2)}
          </pre>
        </details>
      )}
    </div>
  )

  const renderActionButtons = () => (
    <div className={cn(
      'flex items-center gap-2',
      compact ? 'flex-col sm:flex-row' : 'flex-row'
    )}>
      <Button
        onClick={handleCreateUpdate}
        disabled={isLoading}
        size={compact ? 'sm' : 'default'}
        className="flex items-center gap-2 flex-1 sm:flex-none"
      >
        {isActing ? (
          <LoadingSpinner size="sm" />
        ) : (
          <CameraIcon className="h-4 w-4" />
        )}
        {isActing ? 'Creating...' : 'Create Update'}
      </Button>

      <Button
        variant="ghost"
        onClick={handleDismiss}
        disabled={isLoading}
        size={compact ? 'sm' : 'default'}
        className="text-gray-600 hover:text-gray-800"
      >
        Maybe later
      </Button>
    </div>
  )

  const renderTemplateAttribution = () => {
    if (!showTemplateAttribution || !prompt.template?.is_community_contributed) {
      return null
    }

    return (
      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <DocumentTextIcon className="h-3 w-3" />
          <span>Community-contributed template</span>
          {prompt.template.effectiveness_score && (
            <span className="text-gray-400">
              • {prompt.template.effectiveness_score.toFixed(1)} rating
            </span>
          )}
          {prompt.template.usage_count && prompt.template.usage_count > 0 && (
            <span className="text-gray-400">
              • Used {prompt.template.usage_count} times
            </span>
          )}
        </div>
      </div>
    )
  }

  // =============================================================================
  // MAIN RENDER
  // =============================================================================

  return (
    <div
      className={cn(
        'rounded-lg border p-4 transition-all duration-200 hover:shadow-sm',
        config.color,
        compact && 'p-3',
        isLoading && 'opacity-75'
      )}
      role="article"
      aria-labelledby={`prompt-${prompt.id}-title`}
    >
      {renderPromptHeader()}
      {renderPromptContent()}
      {renderActionButtons()}
      {renderTemplateAttribution()}
    </div>
  )
}

// =============================================================================
// SKELETON LOADER
// =============================================================================

export function AIPromptCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-lg border border-gray-200 bg-gray-50 animate-pulse',
        compact ? 'p-3' : 'p-4'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-6 h-6 bg-gray-200 rounded" />
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-48" />
          </div>
        </div>
        <div className="w-6 h-6 bg-gray-200 rounded" />
      </div>

      {/* Content */}
      <div className="mb-4 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        {!compact && <div className="h-4 bg-gray-200 rounded w-5/6" />}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <div className={cn(
          'bg-gray-200 rounded',
          compact ? 'h-8 w-24' : 'h-10 w-32'
        )} />
        <div className={cn(
          'bg-gray-200 rounded',
          compact ? 'h-8 w-20' : 'h-10 w-24'
        )} />
      </div>
    </div>
  )
}

// =============================================================================
// PROMPT LIST COMPONENT
// =============================================================================

interface AIPromptListProps {
  prompts: AIPrompt[]
  onDismissPrompt: (promptId: string) => Promise<void>
  onActOnPrompt: (promptId: string) => Promise<void>
  loading?: boolean
  compact?: boolean
  showTemplateAttribution?: boolean
  emptyStateMessage?: string
}

export function AIPromptList({
  prompts,
  onDismissPrompt,
  onActOnPrompt,
  loading = false,
  compact = false,
  showTemplateAttribution = true,
  emptyStateMessage = "No prompts available right now."
}: AIPromptListProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <AIPromptCardSkeleton key={i} compact={compact} />
        ))}
      </div>
    )
  }

  if (!prompts || prompts.length === 0) {
    return (
      <div className="text-center py-8">
        <SparklesIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-sm font-medium text-gray-900 mb-2">No prompts available</h3>
        <p className="text-sm text-gray-500 max-w-sm mx-auto">
          {emptyStateMessage}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {prompts.map((prompt) => (
        <AIPromptCard
          key={prompt.id}
          prompt={prompt}
          onDismiss={onDismissPrompt}
          onActOn={onActOnPrompt}
          compact={compact}
          showTemplateAttribution={showTemplateAttribution}
        />
      ))}
    </div>
  )
}

export default AIPromptCard
