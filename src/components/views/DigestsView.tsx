/**
 * DigestsView Component
 * CRO-296: Middle Pane - Content Router
 * CRO-304: Component Migration & Comprehensive Testing
 *
 * Summaries view - summary compilation and history
 */

'use client';

import { useAuth } from '@/hooks/useAuth';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import SummaryStats from '@/components/summaries/SummaryStats';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { useLayout } from '@/contexts/LayoutContext';

export default function DigestsView() {
  const { user } = useAuth();
  const { focusMode, setFocusMode } = useLayout();

  // Enable scroll restoration for this view
  useScrollRestoration({ viewKey: 'summaries' });

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-full p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-neutral-900 mb-6">Memory Book</h1>
        {focusMode && (
          <Alert
            variant="info"
            icon={null}
            title="Tools view available"
            className="mb-6"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p>
                Access scheduling controls and recent summary tools from the tools view whenever you need them.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="sm:flex-shrink-0"
                onClick={() => setFocusMode(false)}
              >
                Switch to tools view
              </Button>
            </div>
          </Alert>
        )}
        <SummaryStats />
      </div>
    </div>
  );
}
