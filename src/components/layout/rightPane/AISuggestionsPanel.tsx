/**
 * AISuggestionsPanel Component
 * CRO-298: Right Pane - Activity View Context
 *
 * Displays AI-generated prompt suggestions for creating updates:
 * - 2-3 AI-generated prompt cards
 * - Thumbnail preview
 * - One-click apply
 */

'use client';

import { useState, useEffect } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { cn } from '@/lib/utils';

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

// Mock suggestions - in real implementation, these would come from an API
const MOCK_SUGGESTIONS: AIPromptSuggestion[] = [
  {
    id: '1',
    prompt: "Share what made you smile today",
    category: 'Daily Moments',
  },
  {
    id: '2',
    prompt: "Document a new skill or milestone",
    category: 'Milestones',
  },
  {
    id: '3',
    prompt: "Capture a funny moment or quote",
    category: 'Memories',
  },
];

export function AISuggestionsPanel({
  onSelectPrompt,
  className,
}: AISuggestionsPanelProps) {
  const [suggestions, setSuggestions] = useState<AIPromptSuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSuggestions();
  }, []);

  const loadSuggestions = async () => {
    try {
      setLoading(true);
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      setSuggestions(MOCK_SUGGESTIONS);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error loading AI suggestions:', error);
    } finally {
      setLoading(false);
    }
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

  return (
    <Card className={cn('p-4', className)}>
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-4 w-4 text-purple-600" />
        <h3 className="text-sm font-semibold text-neutral-900">AI Suggestions</h3>
      </div>

      <div className="space-y-3">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.id}
            onClick={() => onSelectPrompt(suggestion)}
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
        ))}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={loadSuggestions}
        className="w-full mt-3 text-xs"
      >
        <Sparkles className="h-3 w-3 mr-1" />
        Refresh suggestions
      </Button>
    </Card>
  );
}
