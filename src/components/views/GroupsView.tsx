/**
 * GroupsView Component
 * CRO-296: Middle Pane - Content Router
 *
 * Group management view
 */

'use client';

import { useScrollRestoration } from '@/hooks/useScrollRestoration';

export default function GroupsView() {
  // Enable scroll restoration for this view
  useScrollRestoration({ viewKey: 'groups' });

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-neutral-900 mb-4">Groups</h1>
        <p className="text-neutral-600">
          Group management interface will appear here.
        </p>
      </div>
    </div>
  );
}
