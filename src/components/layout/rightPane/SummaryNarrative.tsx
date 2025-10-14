'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, CalendarDays, Send } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useSummaryCompilation } from '@/hooks/useSummaryCompilation';
import { useDraftManagement } from '@/hooks/useDraftManagement';
import { cn } from '@/lib/utils';

export interface SummaryNarrativeProps {
  className?: string;
}

const formatDate = (input?: string) => {
  if (!input) return null;
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
  }).format(date);
};

const pluralize = (count: number, singular: string, pluralForm?: string) => {
  if (count === 1) return `${count} ${singular}`;
  return `${count} ${pluralForm ?? `${singular}s`}`;
};

export function SummaryNarrative({ className }: SummaryNarrativeProps) {
  const { stats, loading: statsLoading, loadStats } = useSummaryCompilation();
  const { summary, loading: draftsLoading, loadSummary } = useDraftManagement();

  useEffect(() => {
    loadStats();
    loadSummary();
  }, [loadStats, loadSummary]);

  if (statsLoading || draftsLoading) {
    return (
      <Card padding="none" className={cn('right-pane-card right-pane-card--bordered flex items-center justify-center h-32', className)}>
        <LoadingSpinner size="sm" />
      </Card>
    );
  }

  const totalDrafts = summary?.total_drafts ?? 0;
  const readyCount = summary?.ready_count ?? 0;
  const draftsNeedingReview = Math.max(totalDrafts - readyCount, 0);
  const pendingReview = stats?.pending_review ?? 0;
  const sentThisMonth = stats?.sent_this_month ?? 0;
  const lastSent = formatDate(stats?.last_sent_at);

  const totalCaptured = totalDrafts;
  const highlight = totalCaptured > 0
    ? `This week you tucked away ${pluralize(totalCaptured, 'quiet moment', 'quiet moments')}.`
    : 'It has been a calm week—capture a new moment while it’s fresh.';

  const readinessLine = readyCount > 0
    ? `${pluralize(readyCount, 'story', 'stories')} ${readyCount === 1 ? 'is' : 'are'} ready for your next digest.`
    : draftsNeedingReview > 0
      ? `${pluralize(draftsNeedingReview, 'draft')} ${draftsNeedingReview === 1 ? 'needs' : 'need'} a quick polish before they can be shared.`
      : 'Start a new note and we will guide it into your next recap.';

  const cadenceLine = sentThisMonth > 0
    ? `You have already shared ${pluralize(sentThisMonth, 'summary', 'summaries')} this month.`
    : lastSent
      ? `Your last digest went out on ${lastSent}.`
      : 'Your first summary is just a few stories away.';

  const reviewLine = pendingReview > 0
    ? `There ${pendingReview === 1 ? 'is' : 'are'} ${pluralize(pendingReview, 'memory', 'memories')} waiting in review.`
    : null;

  return (
    <Card padding="none" className={cn('right-pane-card right-pane-card--bordered space-y-4', className)}>
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-purple-600" />
        <h3 className="text-sm font-semibold text-neutral-900">Summary recap</h3>
      </div>

      <div className="space-y-3 text-sm text-neutral-600">
        <p>{highlight}</p>
        <p>{readinessLine}</p>
        <p>{cadenceLine}</p>
        {reviewLine && <p>{reviewLine}</p>}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/dashboard/digests" className="w-full sm:w-auto">
          <Button variant="secondary" size="sm" className="w-full justify-center">
            <Send className="mr-2 h-3.5 w-3.5" />
            Open digest workspace
          </Button>
        </Link>
        <Link href="/dashboard/drafts" className="w-full sm:w-auto">
          <Button variant="ghost" size="sm" className="w-full justify-center">
            <CalendarDays className="mr-2 h-3.5 w-3.5" />
            Review drafts
          </Button>
        </Link>
      </div>
    </Card>
  );
}
