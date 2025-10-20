'use client';

import { useMemo } from 'react';
import { Sparkles, Heart, CalendarDays, Feather, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { AIPromptSuggestion } from './AISuggestionsPanel';

const icons = {
  reflection: Feather,
  gratitude: Heart,
  ritual: CalendarDays,
} as const;

type InspirationType = keyof typeof icons;

interface InspirationItem {
  id: string;
  type: InspirationType;
  title: string;
  description: string;
  prompt: string;
  category: string;
}

export interface ReflectionPromptsPanelProps {
  onSelectPrompt: (prompt: AIPromptSuggestion) => void;
  onCreateMemory: () => void;
  className?: string;
}

const reflectionIdeas: InspirationItem[] = [
  {
    id: 'reflection-weekly-heartbeat',
    type: 'reflection',
    title: "Weekly heartbeat",
    description: 'Capture the small win or surprise that stood out this week.',
    prompt: 'What moment made your family pause and smile this week?',
    category: 'Weekly reflection',
  },
  {
    id: 'gratitude-shoutout',
    type: 'gratitude',
    title: 'Gratitude shoutout',
    description: 'Name someone who supported you or your child recently.',
    prompt: 'Who are you grateful for right now and why?',
    category: 'Gratitude',
  },
  {
    id: 'ritual-theme',
    type: 'ritual',
    title: 'Weekend ritual',
    description: 'Note a ritual you want to remember before the week rushes by.',
    prompt: 'What weekly ritual helps your family reset?',
    category: 'Family rhythm',
  },
];

const getRotatingIdeas = (): InspirationItem[] => {
  const weekIndex = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  return reflectionIdeas
    .map((idea, index) => ({ idea, index }))
    .sort((a, b) => (a.index + weekIndex) % reflectionIdeas.length - (b.index + weekIndex) % reflectionIdeas.length)
    .map(({ idea }) => idea);
};

export function ReflectionPromptsPanel({
  onSelectPrompt,
  onCreateMemory,
  className,
}: ReflectionPromptsPanelProps) {
  const rotatingIdeas = useMemo(getRotatingIdeas, []);

  return (
    <div className={cn('right-pane-card right-pane-card--bordered space-y-4', className)}>
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-purple-600" />
        <h3 className="text-sm font-semibold text-neutral-900">Reflection inspiration</h3>
      </div>

      <p className="text-xs text-neutral-500">
        Choose a prompt to queue up your next story. We will carry it into the memory composer so you can finish it when you have a moment.
      </p>

      <div className="space-y-3">
        {rotatingIdeas.map((idea) => {
          const Icon = icons[idea.type];

          return (
            <button
              key={idea.id}
              type="button"
              className={cn(
                'w-full text-left rounded-lg border border-neutral-200 p-3 transition-all',
                'hover:border-purple-300 hover:bg-purple-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400'
              )}
              onClick={() =>
                onSelectPrompt({
                  id: idea.id,
                  prompt: idea.prompt,
                  category: idea.category,
                })
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-purple-50 text-purple-600">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-neutral-900">{idea.title}</p>
                    <p className="text-xs text-neutral-500">{idea.description}</p>
                  </div>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 text-neutral-300" />
              </div>
            </button>
          );
        })}
      </div>

      <div className="border-t border-neutral-200 pt-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full justify-center text-xs"
          onClick={onCreateMemory}
        >
          Start a fresh memory
        </Button>
      </div>
    </div>
  );
}
