/**
 * ViewLoadingState Component
 * CRO-296: Middle Pane - Content Router
 *
 * Loading state displayed during async view loading
 */

'use client';

import { LoadingState } from '@/components/ui/LoadingState';

/**
 * Loading state shown while views are being loaded
 */
export function ViewLoadingState() {
  return (
    <div className="px-4 py-8" aria-live="polite" aria-busy="true">
      <LoadingState
        type="skeleton"
        variant="list"
        className="mx-auto max-w-3xl"
        skeletonOptions={{ count: 4, itemHeight: 96, showHeader: true, spacing: 'lg' }}
      />
    </div>
  );
}
