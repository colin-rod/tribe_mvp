/**
 * RecipientsView Component
 * CRO-296: Middle Pane - Content Router
 *
 * Recipient management view
 */

'use client';

import { useScrollRestoration } from '@/hooks/useScrollRestoration';

export default function RecipientsView() {
  // Enable scroll restoration for this view
  useScrollRestoration({ viewKey: 'recipients' });

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-neutral-900 mb-4">Recipients</h1>
        <p className="text-neutral-600">
          Recipient management interface will appear here.
        </p>
      </div>
    </div>
  );
}
