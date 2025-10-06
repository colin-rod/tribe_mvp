/**
 * AISuggestionsPanel Component
 * CRO-298: Right Pane - Activity View Context
 *
 * Displays prompt suggestions for creating updates:
 * - Single prompt card suggestion from database
 * - Thumbnail preview
 * - One-click apply
 * - Engagement tracking
 */

'use client';

import { useState, useEffect } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { cn } from '@/lib/utils';
import {
  getRandomPromptSuggestion,
  trackPromptShown,
  trackPromptClicked,
} from '@/lib/prompts';

export interface AIPromptSuggestion {
  id: string;
  prompt: string;
  category: string;
  thumbnail?: string;
}

export interface AISuggestionsPanelProps {
  /** Callback when a prompt is selected */
  onSelectPrompt: (prompt: AIPromptSuggestion) => void;
  /** Optional className for custom styling */
  className?: string;
}

export function AISuggestionsPanel({
  onSelectPrompt,
  className,
}: AISuggestionsPanelProps) {
  const [suggestion, setSuggestion] = useState<AIPromptSuggestion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSuggestion();
  }, []);

  const loadSuggestion = async () => {
    try {
      setLoading(true);
      const data = await getRandomPromptSuggestion();

      if (data) {
        const mappedSuggestion: AIPromptSuggestion = {
          id: data.id,
          prompt: data.prompt_text,
          category: data.category,
        };
        setSuggestion(mappedSuggestion);

        // Track that this prompt was shown
        await trackPromptShown(data.id);
      }
    } catch (error) {
      // Error is already logged in the prompts service
      // Silently fail and show empty state
    } finally {
      setLoading(false);
    }
  };

  const handlePromptClick = async (promptSuggestion: AIPromptSuggestion) => {
    // Track click before calling parent handler
    await trackPromptClicked(promptSuggestion.id);
    onSelectPrompt(promptSuggestion);
  };

  if (loading) {
    return (
      <Card className={cn('p-4', className)}>
        <div className="flex items-center justify-center h-32">
          <LoadingSpinner size="sm" />
        </div>
      </Card>
    );
  }

  if (!suggestion) {
    return (
      <Card className={cn('p-4', className)}>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-4 w-4 text-purple-600" />
          <h3 className="text-sm font-semibold text-neutral-900">Update Suggestions</h3>
        </div>
        <p className="text-sm text-neutral-500">No suggestions available</p>
      </Card>
    );
  }

  return (
    <Card className={cn('p-4', className)}>
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-4 w-4 text-purple-600" />
        <h3 className="text-sm font-semibold text-neutral-900">Update Suggestions</h3>
      </div>

      <div className="space-y-3">
        <button
          onClick={() => handlePromptClick(suggestion)}
          className={cn(
            'w-full p-3 text-left rounded-lg border border-neutral-200',
            'hover:border-purple-300 hover:bg-purple-50/50 transition-all',
            'group relative'
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="text-sm font-medium text-neutral-900 mb-1">
                {suggestion.prompt}
              </p>
              <p className="text-xs text-neutral-500">{suggestion.category}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-neutral-400 group-hover:text-purple-600 transition-colors shrink-0" />
          </div>

          {suggestion.thumbnail && (
            <div className="mt-2 rounded overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={suggestion.thumbnail}
                alt=""
                className="w-full h-20 object-cover"
              />
            </div>
          )}
        </button>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={loadSuggestion}
        className="w-full mt-3 text-xs"
      >
        <Sparkles className="h-3 w-3 mr-1" />
        Refresh suggestions
      </Button>
    </Card>
  );
}
