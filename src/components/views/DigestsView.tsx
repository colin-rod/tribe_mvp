/**
 * DigestsView Component
 * CRO-296: Middle Pane - Content Router
 *
 * Digests view - digest compilation and history
 */

'use client';

import { useScrollRestoration } from '@/hooks/useScrollRestoration';

export default function DigestsView() {
  // Enable scroll restoration for this view
  useScrollRestoration({ viewKey: 'digests' });

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-neutral-900 mb-4">Digests</h1>
        <p className="text-neutral-600">
          Digest compilation and history will appear here.
        </p>
      </div>
    </div>
  );
}
