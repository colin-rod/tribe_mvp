/**
 * ViewLoadingState Component
 * CRO-296: Middle Pane - Content Router
 *
 * Loading state displayed during async view loading
 */

'use client';

import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

/**
 * Loading state shown while views are being loaded
 */
export function ViewLoadingState() {
  return (
    <div
      className="flex items-center justify-center min-h-[400px]"
      role="status"
      aria-live="polite"
      aria-label="Loading content"
    >
      <LoadingSpinner size="lg" />
    </div>
  );
}
